/**
 * Copyright 2013-2018 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see http://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Serano Colameo - Initial contribution and API
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
//import  { DidChangeTextDocumentNotification } from 'vscode-languageclient/lib/protocol';
var process = require('process');
class PlantUMLRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    init(langClient) {
        let renderer = new Renderer(langClient);
        this.provider = new PreviewProvider(renderer);
        this.prepareAndRegisterContentProvider();
        this.prepareAndRegisterCommands();
    }
    prepareAndRegisterContentProvider() {
        let registration = vscode.workspace.registerTextDocumentContentProvider('plantuml-preview', this.provider);
        this.ctx.subscriptions.push(this.provider);
    }
    prepareAndRegisterCommands() {
        this.preparePreviewCmd();
    }
    preparePreviewCmd() {
        let cmdPreview = vscode.commands.registerTextEditorCommand('plantuml.preview', () => {
            let ret = vscode.commands.executeCommand('vscode.previewHtml', PlantUMLRenderer.PREVIEW_URI, vscode.ViewColumn.Two, 'PlantUML');
            ret.then((ok) => {
                this.provider.update(PlantUMLRenderer.PREVIEW_URI);
            }, (err) => {
                vscode.window.showErrorMessage(err);
            });
        });
        this.ctx.subscriptions.push(cmdPreview);
    }
}
PlantUMLRenderer.PREVIEW_URI = vscode.Uri.parse('plantuml-preview://authority/plantuml-preview');
exports.PlantUMLRenderer = PlantUMLRenderer;
class PreviewProvider {
    constructor(renderer) {
        this.renderer = renderer;
        this.onDidChangeVar = new vscode.EventEmitter();
    }
    dispose() {
        this.onDidChangeVar.dispose();
    }
    get onDidChange() {
        return this.onDidChangeVar.event;
    }
    update(uri) {
        this.onDidChangeVar.fire(uri);
    }
    provideTextDocumentContent(uri, token) {
        this.renderer.preview = true;
        return this.renderer.render();
    }
}
class Renderer {
    constructor(langClient) {
        this.langClient = langClient;
        this.preview = true;
        this.editor = null;
    }
    /*
        public sendChangeNotification(uri: string, version: number) {
            this.langClient.sendNotification(DidChangeTextDocumentNotification.type, {
                textDocument: {
                    uri: uri,
                    version: version
                },
                contentChanges: [{ text: this.editor.document.getText() }]
            });
        }
    */
    render() {
        let ret = null;
        this.editor = vscode.window.activeTextEditor;
        if (this.editor == null || this.editor.document.languageId !== "jdl") {
            return ret;
        }
        ret = this.toHtml(this.editor.document.uri);
        this.editor = null;
        return ret;
    }
    toPngFile(file) {
        var pos = file.lastIndexOf('.jdl');
        var str = file.substring(0, pos) + '.png';
        return str;
    }
    toUriString(uri) {
        return uri.toString(false);
    }
    getWorkingPath() {
        let fsPath = this.editor.document.uri.fsPath;
        let dirName = path.dirname(fsPath);
        if (dirName === ".") {
            dirName = vscode.workspace.rootPath;
            if (dirName === undefined) {
                dirName = process.env['HOME'];
                if (dirName === undefined) {
                    dirName = process.env['USERPROFILE'];
                }
            }
            fsPath = dirName + "/" + fsPath;
        }
        return [dirName, fsPath];
    }
    toHtml(uri) {
        let ret = null;
        let imageUri = this.toPngFile(this.toUriString(uri));
        let imageFile = this.toPngFile(uri.fsPath);
        if (this.preview) {
            if (fs.existsSync(imageFile)) {
                ret = new Promise((res) => {
                    let html = `<html><body style="background-color:white;"><img src="${imageUri}"></body></html>`;
                    res(html);
                });
            }
            else {
                ret = new Promise((res) => {
                    let html = `<html><body>Image file ${imageFile} not found!</body></html>`;
                    res(html);
                });
            }
        }
        return ret;
    }
}
//# sourceMappingURL=plantuml.js.map