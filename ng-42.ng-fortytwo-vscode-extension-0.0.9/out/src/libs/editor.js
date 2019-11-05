"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function showAndOpen(srcPath) {
    return vscode.workspace.openTextDocument(srcPath)
        .then((textDocument) => vscode.window.showTextDocument(textDocument));
}
exports.showAndOpen = showAndOpen;
function showError(err) {
    return vscode.window.showErrorMessage(err);
}
exports.showError = showError;
//# sourceMappingURL=editor.js.map