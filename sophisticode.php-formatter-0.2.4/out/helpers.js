"use strict";
var Helper = (function () {
    function Helper() {
    }
    return Helper;
}());
exports.Helper = Helper;
function getNumSelectedLines(selection) {
    return (selection !== null) ? selection.end.line + 1 - selection.start.line : 0;
}
function getSelection() {
    var selection = null;
    if (!window.activeTextEditor.selection.isEmpty) {
        var sel = window.activeTextEditor.selection;
        selection = new Range(sel.start, sel.end);
        logDebug('User has made a selection in the document ([' + selection.start.line + ', ' + selection.start.character + '], [' + selection.end.line + ', ' + selection.end.character + ']).');
    }
    return selection;
}
// Puts quotes around the given string and returns the resulting string.
function enquote(input) {
    return '"' + input + '"';
}
// Logs a message to the console if the phpformatter.logging setting is set to true.
function logDebug(message) {
    if (workspace.getConfiguration('phpformatter').get('logging', false) === true) {
        console.log('PHPFormatter: ' + message);
    }
}
//# sourceMappingURL=helpers.js.map