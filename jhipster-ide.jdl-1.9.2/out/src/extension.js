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
const plantuml_1 = require("./plantuml");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
let plantuml;
var process = require('process');
function activate(context) {
    let executable = process.platform == 'win32' ? 'jdl-ls.bat' : 'jdl-ls';
    let serverLauncher = context.asAbsolutePath(path.join('jdl-ls', 'bin', executable));
    let serverOptions = {
        run: { command: serverLauncher },
        debug: { command: serverLauncher }
    };
    let clientOptions = {
        documentSelector: ['jdl', 'jh'],
        synchronize: {
            configurationSection: 'languageServerExample',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.*')
        }
    };
    process.env['JDL_LS_OPTS'] = "-Dpnguml.gen=true -Xdebug -Xrunjdwp:server=y,transport=dt_socket,address=9999,suspend=n,quiet=y";
    let langClient = new vscode_languageclient_1.LanguageClient('JDL Xtext Server', serverOptions, clientOptions);
    let disposable = langClient.start();
    let activeEditor = vscode.window.activeTextEditor;
    //let result = commands.executeCommand("init", activeEditor.document.uri.toString())
    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
    plantuml = new plantuml_1.PlantUMLRenderer(context);
    plantuml.init(langClient);
}
exports.activate = activate;
function deactivate() {
    plantuml = null;
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map