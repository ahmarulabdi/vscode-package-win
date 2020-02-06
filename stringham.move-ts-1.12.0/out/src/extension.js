'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const fileitem_1 = require("./fileitem");
const referenceindexer_1 = require("./index/referenceindexer");
function warn(importer) {
    if (importer.conf('skipWarning', false) || importer.conf('openEditors', false)) {
        return Promise.resolve(true);
    }
    return vscode.window
        .showWarningMessage('This will save all open editors and all changes will immediately be saved. Do you want to continue?', 'Yes, I understand')
        .then((response) => {
        if (response == 'Yes, I understand') {
            return true;
        }
        else {
            return false;
        }
    });
}
function warnThenMove(importer, item) {
    return warn(importer).then((success) => {
        if (success) {
            return vscode.workspace.saveAll(false).then(() => {
                importer.startNewMove(item.sourcePath, item.targetPath);
                const move = item.move(importer);
                move.catch(e => {
                    console.log('error in extension.ts', e);
                });
                if (!item.isDir) {
                    return move
                        .then(item => {
                        return Promise.resolve(vscode.workspace.openTextDocument(item.targetPath)).then((textDocument) => vscode.window.showTextDocument(textDocument));
                    })
                        .catch(e => {
                        console.log('error in extension.ts', e);
                    });
                }
                return move;
            });
        }
        return undefined;
    });
}
function move(importer, fsPath) {
    const isDir = fs.statSync(fsPath).isDirectory();
    return vscode.window.showInputBox({ prompt: 'Where would you like to move?', value: fsPath }).then(value => {
        if (!value || value == fsPath) {
            return;
        }
        const item = new fileitem_1.FileItem(fsPath, value, isDir);
        if (item.exists()) {
            vscode.window.showErrorMessage(value + ' already exists.');
            return;
        }
        if (item.isDir && referenceindexer_1.isInDir(fsPath, value)) {
            vscode.window.showErrorMessage('Cannot move a folder within itself');
            return;
        }
        return warnThenMove(importer, item);
    });
}
function moveMultiple(importer, paths) {
    const dir = path.dirname(paths[0]);
    if (!paths.every(p => path.dirname(p) == dir)) {
        return Promise.resolve();
    }
    return vscode.window.showInputBox({ prompt: 'Which directory would you like to move these to?', value: dir }).then((value) => {
        if (!value || path.extname(value) != '') {
            vscode.window.showErrorMessage('Must be moving to a directory');
            return;
        }
        const newLocations = paths.map(p => {
            const newLocation = path.resolve(value, path.basename(p));
            return new fileitem_1.FileItem(p, newLocation, fs.statSync(p).isDirectory());
        });
        if (newLocations.some(l => l.exists())) {
            vscode.window.showErrorMessage('Not allowed to overwrite existing files');
            return;
        }
        if (newLocations.some(l => l.isDir && referenceindexer_1.isInDir(l.sourcePath, l.targetPath))) {
            vscode.window.showErrorMessage('Cannot move a folder within itself');
            return;
        }
        return warn(importer).then((success) => {
            if (success) {
                return vscode.workspace.saveAll(false).then(() => {
                    importer.startNewMoves(newLocations);
                    const move = fileitem_1.FileItem.moveMultiple(newLocations, importer);
                    move.catch(e => {
                        console.log('error in extension.ts', e);
                    });
                    return move;
                });
            }
        });
    });
}
function getCurrentPath() {
    const activeEditor = vscode.window.activeTextEditor;
    const document = activeEditor && activeEditor.document;
    return (document && document.fileName) || '';
}
function activate(context) {
    const importer = new referenceindexer_1.ReferenceIndexer();
    function initWithProgress() {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: 'Move-ts indexing',
        }, (progress) => __awaiter(this, void 0, void 0, function* () {
            return importer.init(progress);
        }));
    }
    const initialize = () => {
        if (importer.isInitialized) {
            return Promise.resolve();
        }
        return initWithProgress();
    };
    const moveDisposable = vscode.commands.registerCommand('move-ts.move', (uri, uris) => {
        if (uris && uris.length > 1) {
            const dir = path.dirname(uris[0].fsPath);
            if (uris.every(u => path.dirname(u.fsPath) == dir)) {
                return initialize().then(() => {
                    return moveMultiple(importer, uris.map(u => u.fsPath));
                });
            }
        }
        let filePath = uri ? uri.fsPath : getCurrentPath();
        if (!filePath) {
            filePath = getCurrentPath();
        }
        if (!filePath || filePath.length == 0) {
            vscode.window.showErrorMessage('Could not find target to move. Right click in explorer or open a file to move.');
            return;
        }
        const go = () => {
            return move(importer, filePath);
        };
        return initialize().then(() => go());
    });
    context.subscriptions.push(moveDisposable);
    const reIndexDisposable = vscode.commands.registerCommand('move-ts.reindex', () => {
        return initWithProgress();
    });
    context.subscriptions.push(reIndexDisposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map