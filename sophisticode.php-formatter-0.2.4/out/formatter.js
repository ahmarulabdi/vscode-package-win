"use strict";
var vscode_1 = require('vscode');
var child_process_1 = require('child_process');
var path = require('path');
var open = require('../node_modules/open');
var tmp = require('../node_modules/tmp');
var fs = require('fs');
// import * as fs from 'fs'; // Can't use this because the typed version does not support a property we need. So we're using the require() method instead.
var helper_1 = require('./helper');
var Formatter = (function () {
    function Formatter() {
    }
    /**
     * Applies the appropriate formats to the active text editor.
     *
     * @param document TextDocument to format. Edits will be applied to this document.
     * @param selection Range to format. If there is no selection, or the selection is empty, the whole document will be formatted.
     */
    Formatter.prototype.formatDocument = function (document, selection) {
        this.getTextEdits(document, selection).then(function (textEdits) {
            textEdits.forEach(function (te) {
                vscode_1.window.activeTextEditor.edit(function (textEditorEdit) {
                    textEditorEdit.replace(te.range, te.newText);
                });
            });
        });
    };
    /**
     * Returns a Promise with an array of TextEdits that should be applied when formatting.
     *
     * @param document TextDocument to format. Edits will be applied to this document.
     * @param selection Range to format. If there is no selection, or the selection is empty, the whole document will be formatted.
     * @return Promise with an array of TextEdit.
     */
    Formatter.prototype.getTextEdits = function (document, selection) {
        return new Promise(function (resolve, reject) {
            // Makes our code a little more readable by extracting the config properties into their own variables.
            var config = vscode_1.workspace.getConfiguration('phpformatter');
            var _pharPath = config.get('pharPath', '');
            var _phpPath = config.get('phpPath', '');
            var _composer = config.get('composer', false);
            var _arguments = config.get('arguments', []);
            var _level = config.get('level', '');
            var _fixers = config.get('fixers', '');
            var _additionalExtensions = config.get('additionalExtensions', []);
            var _notifications = config.get('notifications', false);
            if (document.languageId !== 'php') {
                if (Array.isArray(_additionalExtensions) && _additionalExtensions.indexOf(document.languageId) != -1) {
                    helper_1.Helper.logDebug('File is in additionalExtensions array, continuing...');
                }
                else {
                    var message = 'This is neither a .php file, nor anything that was set in additionalExtensions. Aborting...';
                    helper_1.Helper.logDebug(message);
                    return reject(message);
                }
            }
            tmp.setGracefulCleanup(); // Temp files should be cleaned up afterwards
            // Variable args will represent the command string.
            // All the arguments for the command will be appended to the array,
            // so they can later be joined and delimited by spaces more easily.
            var args = ['fix'];
            var filePath = path.normalize(document.uri.fsPath);
            // Now let's handle anything related to temp files.
            // TODO: Use document.lineCount to warn user about possibly crashing the editor because of having to write the file contents
            helper_1.Helper.logDebug('Creating temp file.');
            var tempFile = tmp.fileSync({ prefix: 'phpfmt-' }); // Create temp file itself (empty).
            var tempFileFd = tempFile.fd; // File descriptor of temp file
            var prependedPhpTag = false; // Whether the to-be-fixed content has a '<?php' tag prepended or not. This is important, because if there is not such a tag present, we'll have to prepend it ourselves, otherwise PHP-CS-Fixer won't do anything.
            var contentToFix = document.getText(); // The content that should be fixed. If there is a selection, this will be replaced with the selected text.
            filePath = tempFile.name;
            helper_1.Helper.logDebug('Tempfile fd: ' + tempFile.fd);
            helper_1.Helper.logDebug('Tempfile name: ' + filePath);
            helper_1.Helper.logDebug('Writing current document content to temp file. Until VSCode will have a way of querying encoding, utf8 will be used for reading and writing.');
            // First, we'll assume there is no selection, and just select the whole document.
            // Determine the active document's end position (last line, last character).
            var documentEndPosition = new vscode_1.Position(document.lineCount - 1, document.lineAt(new vscode_1.Position(document.lineCount - 1, 0)).range.end.character);
            var editRange = new vscode_1.Range(new vscode_1.Position(0, 0), documentEndPosition);
            // If the user made a selection, then only copy the selected text.
            // Also, save that range so we will only replace that part of code after formatting.
            if (helper_1.Helper.selectionNotEmpty(selection)) {
                var selectionText = document.getText(selection);
                editRange = selection;
                // If the selected text does not have a PHP opening tag, then
                // prepend one manually. Otherwise PHP-CS-Fixer will not do
                // anything at all.
                if (selectionText.indexOf('<?') == -1) {
                    helper_1.Helper.logDebug('No PHP opening tag found, prepending <?php to selection');
                    selectionText = '<?php\n' + selectionText;
                    prependedPhpTag = true;
                }
                contentToFix = selectionText;
            }
            // Write the relevant content to the temp file
            fs.writeFileSync(tempFileFd, contentToFix, { encoding: 'utf8' });
            // Make sure to put double quotes around our path, otherwise the command
            // (Symfony, actually) will fail when it encounters paths with spaces in them.
            var escapedPath = helper_1.Helper.enquote(filePath);
            args.push(escapedPath);
            // phpformatter.arguments will only be used if neither phpformatter.level
            // nor phpformatter.fixers are set.
            // This will be here until phpformatter.level and phpformatter.fixers are
            // removed from the plugin in a future update.
            if (_level)
                args.push('--level=' + _level);
            if (_fixers)
                args.push('--fixers=' + _fixers);
            if (_level == '' && _fixers == '') {
                args = args.concat(_arguments);
            }
            var fixCommand = '';
            if (_composer) {
                // If PHP-CS-Fixer was installed using Composer, and it was added to the PATH,
                // then we don't have to prepend the command with 'php' or point to the .phar file.
                fixCommand = 'php-cs-fixer ' + args.join(' ');
            }
            else if (_pharPath) {
                // If PHP-CS-Fixer was installed manually, then we will have to provide the full
                // .phar file path. And optionally include the php path as well.
                args.unshift(helper_1.Helper.enquote(_pharPath));
                fixCommand = helper_1.Helper.enquote(_phpPath) + ' ' + args.join(' ');
            }
            else {
                var message = 'Neither a pharPath or use of Composer was specified. Aborting...';
                if (_notifications)
                    vscode_1.window.showInformationMessage(message);
                helper_1.Helper.logDebug(message);
                return reject(message);
            }
            helper_1.Helper.logDebug('Full command being executed: ' + fixCommand);
            var stdout = '';
            var stderr = '';
            var execResult = child_process_1.exec(fixCommand);
            // Output stdout of the fix command result.
            execResult.stdout.on('data', function (buffer) {
                stdout += buffer.toString();
            });
            // Output stderr of the fix command result.
            execResult.stderr.on('data', function (buffer) {
                stderr += buffer.toString();
            });
            // Handle finishing of the fix command.
            execResult.on('close', function (code) {
                if (stdout) {
                    helper_1.Helper.logDebug('Logging PHP-CS-Fixer command stdout result');
                    helper_1.Helper.logDebug(stdout);
                }
                if (stderr) {
                    helper_1.Helper.logDebug('Logging PHP-CS-Fixer command stderr result');
                    helper_1.Helper.logDebug(stderr);
                }
                // Read the content from the temp file. Pass the encoding as utf8,
                // because we need it to return a string (fs would return buffer
                // otherwise, see https://nodejs.org/docs/latest/api/fs.html#fs_fs_readfilesync_file_options)
                // TODO: Detect current document file encoding so we don't have to
                // assume utf8.
                helper_1.Helper.logDebug('Reading temp file content.');
                // This var will hold the content of the temp file. Every chunk that is read from the ReadStream
                // will be appended to this var.
                var fixedContent = '';
                // The reason we are using fs.createReadStream() instead of simply using fs.readFileSync(),
                // is that the latter does not allow you to set the file descriptor cursor position manually.
                // Doing so is crucial, because otherwise only parts of the file will be read in many cases.
                var readStream = fs.createReadStream(filePath, { fd: tempFileFd, start: 0 });
                // Read the data from the file and append it to the string builder.
                readStream.on('data', function (chunk) {
                    fixedContent += chunk;
                });
                // When EOF is reached, copy the results back to the original file.
                readStream.on('end', function () {
                    // If we prepended a PHP opening tag manually, we'll have to remove
                    // it now, before we overwrite our document.
                    if (prependedPhpTag) {
                        fixedContent = fixedContent.substring(6);
                        helper_1.Helper.logDebug('Removed the prepended PHP opening tag from the formatted text.');
                    }
                    var numSelectedLines = helper_1.Helper.getNumSelectedLines(editRange, document);
                    helper_1.Helper.logDebug('Replacing editor content with formatted code.');
                    helper_1.Helper.logDebug('Document successfully formatted (' + numSelectedLines + ' lines).');
                    var textEdits = [];
                    textEdits.push(vscode_1.TextEdit.replace(editRange, fixedContent));
                    return resolve(textEdits);
                    // This does not work for some reason. Keeping this here as a reminder.
                    // tempFile.removeCallback();
                });
            });
        });
    };
    return Formatter;
}());
exports.Formatter = Formatter;
var PHPDocumentRangeFormattingEditProvider = (function () {
    function PHPDocumentRangeFormattingEditProvider() {
        this.formatter = new Formatter();
    }
    PHPDocumentRangeFormattingEditProvider.prototype.provideDocumentRangeFormattingEdits = function (document, range, options, token) {
        return this.formatter.getTextEdits(document, range);
    };
    return PHPDocumentRangeFormattingEditProvider;
}());
exports.PHPDocumentRangeFormattingEditProvider = PHPDocumentRangeFormattingEditProvider;
//# sourceMappingURL=formatter.js.map