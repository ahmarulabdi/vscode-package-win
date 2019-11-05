"use strict";
var vscode = require("vscode");
var copyPaste = require("copy-paste");
var request = require("request");
var extension = require("./Json2Ts");
var Json2Ts = extension.Json2Ts;
function activate(context) {
    var clipboardJson2ts = vscode.commands.registerCommand("convert.json2ts", function () {
        copyPaste.paste(function (error, content) {
            if (extension.isJson(content)) {
                convert(content);
            }
            else {
                vscode.window.showErrorMessage("Clipboard has no valid JSON content.");
            }
        });
    });
    var restJson2ts = vscode.commands.registerCommand("rest.json2ts", function () {
        copyPaste.paste(function (error, content) {
            if (content && content.indexOf("http") > -1) {
                callRestService(content);
            }
            else {
                vscode.window.showInputBox({ prompt: "Insert your REST-Service URL." })
                    .then(function (userInput) {
                    if (content && content.indexOf("http") > -1) {
                        callRestService(userInput);
                    }
                    else {
                        vscode.window.showErrorMessage("No valid REST-Service URL.");
                    }
                });
            }
        });
        function callRestService(url) {
            vscode.window.setStatusBarMessage("Call " + url + "...");
            request(url, function (error, response, body) {
                if (extension.isJson(body)) {
                    convert(body);
                }
                else {
                    vscode.window.showErrorMessage("REST-Service has no valid JSON result.");
                }
            });
        }
    });
    context.subscriptions.push(clipboardJson2ts, restJson2ts);
}
exports.activate = activate;
function convert(content) {
    vscode.window.setStatusBarMessage("Convert JSON to TypeScript interfaces...");
    var json2ts = new Json2Ts();
    var result = json2ts.convert(content);
    vscode.window.activeTextEditor.edit(function (editBuilder) {
        var startLine = vscode.window.activeTextEditor.selection.start.line;
        var lastCharIndex = vscode.window.activeTextEditor.document.lineAt(startLine).text.length;
        var position = new vscode.Position(startLine, lastCharIndex);
        editBuilder.insert(position, result);
        vscode.window.setStatusBarMessage("Here are your TypeScript interfaces... Enjoy! :)");
    });
}
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map