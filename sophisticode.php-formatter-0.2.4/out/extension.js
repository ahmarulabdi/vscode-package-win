"use strict";
var vscode_1 = require('vscode');
var document_filter_1 = require('./document_filter');
var formatter_1 = require('./formatter');
function activate(context) {
    // Register the 'phpformatter.fix' command.
    var fixCommand = vscode_1.commands.registerCommand('phpformatter.fix', function () {
        var formatter = new formatter_1.Formatter();
        formatter.formatDocument(vscode_1.window.activeTextEditor.document);
    });
    // Register ourselves as a document formatter, so we can do things like FormatOnSave.
    var formattingProvider = vscode_1.languages.registerDocumentRangeFormattingEditProvider(document_filter_1.DOCUMENT_FILTER, new formatter_1.PHPDocumentRangeFormattingEditProvider());
    context.subscriptions.push(fixCommand);
    context.subscriptions.push(formattingProvider);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map