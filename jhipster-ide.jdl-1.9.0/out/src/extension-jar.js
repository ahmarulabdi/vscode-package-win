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
const vscode = require("vscode");
const vscode_jsonrpc_1 = require("vscode-jsonrpc");
const plantuml_1 = require("./plantuml");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
let plantuml;
const LANGUAGE_CLIENT_ID = 'LANGUAGE_ID_JDL';
function activate(context) {
    const libFolder = context.asAbsolutePath(path.join('./jdl-ls/lib/*'));
    let vmargs = '-Dpnguml.gen=true';
    let serverOptions = {
        command: 'java',
        args: [vmargs, '-cp', libFolder, 'org.eclipse.xtext.ide.server.ServerLauncher'],
        options: { stdio: 'pipe' }
    };
    let clientOptions = {
        documentSelector: ['jdl', 'jh'],
        synchronize: {
            configurationSection: 'languageServerExample',
            fileEvents: [
                vscode_1.workspace.createFileSystemWatcher('**/*.jdl'),
                vscode_1.workspace.createFileSystemWatcher('**/*.jh')
            ]
        }
    };
    let item = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Right, Number.MIN_VALUE);
    item.text = 'Starting JDL Language Server...';
    toggleItem(vscode_1.window.activeTextEditor, item);
    let languageClient = new vscode_languageclient_1.LanguageClient(LANGUAGE_CLIENT_ID, 'Language Support for JDL', serverOptions, clientOptions);
    languageClient.onReady().then(() => {
        item.text = 'JDL Language Server started!';
        toggleItem(vscode_1.window.activeTextEditor, item);
    });
    languageClient.trace = vscode_jsonrpc_1.Trace.Off;
    let disposable = languageClient.start();
    let activeEditor = vscode.window.activeTextEditor;
    vscode_1.window.onDidChangeActiveTextEditor((activeEditor) => {
        toggleItem(activeEditor, item);
    });
    /*
    let result = commands.executeCommand("init", activeEditor.document.uri.toString())
    console.log("Init succeeded: "+result);
    */
    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
    plantuml = new plantuml_1.PlantUMLRenderer(context);
    plantuml.init(languageClient);
}
exports.activate = activate;
function deactivate() {
    plantuml = null;
}
exports.deactivate = deactivate;
function toggleItem(editor, item) {
    if (editor && editor.document &&
        (editor.document.languageId === 'jdl' || editor.document.languageId === 'jh')) {
        item.show();
    }
    else {
        item.hide();
    }
}
//# sourceMappingURL=extension-jar.js.map