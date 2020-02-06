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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const vscode_jsonrpc_1 = require("vscode-jsonrpc");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    let connectionInfo = {
        port: 5007
    };
    let serverOptions = () => {
        let socket = net.connect(connectionInfo);
        let result = {
            writer: socket,
            reader: socket
        };
        return Promise.resolve(result);
    };
    let clientOptions = {
        documentSelector: ['jdl', 'jh'],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.*')
        }
    };
    let lc = new vscode_languageclient_1.LanguageClient('JDL Xtext Server', serverOptions, clientOptions);
    var disposable2 = vscode_1.commands.registerCommand("jdl.a.proxy", () => __awaiter(this, void 0, void 0, function* () {
        let activeEditor = vscode_1.window.activeTextEditor;
        if (!activeEditor || !activeEditor.document || activeEditor.document.languageId !== 'jdl') {
            return;
        }
        if (activeEditor.document.uri instanceof vscode_1.Uri) {
            vscode_1.commands.executeCommand("jdl.a", activeEditor.document.uri.toString());
        }
    }));
    context.subscriptions.push(disposable2);
    // enable tracing (.Off, .Messages, Verbose)
    lc.trace = vscode_jsonrpc_1.Trace.Verbose;
    let disposable = lc.start();
    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension-dev.js.map