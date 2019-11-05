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
const vscode_1 = require("vscode");
const nls = require("vscode-nls");
const barrelProvider_1 = require("./providers/barrelProvider");
const barrelConfig_1 = require("./barrelConfig");
const localize = nls.config()();
function init(disposables) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = vscode_1.workspace.rootPath;
        const barrlConfig = new barrelConfig_1.BarrelConfig(vscode_1.workspace.getConfiguration('ng42.barrels'));
        if (!rootPath || !barrlConfig) {
            return;
        }
        const outputChannel = vscode_1.window.createOutputChannel('NG.42');
        outputChannel.appendLine(localize('NG.42 initialized', "NG.42 initialized"));
        const barreler = new barrelProvider_1.BarrelProvider(barrlConfig, outputChannel);
        disposables.push(barreler);
    });
}
function activate(context) {
    if (!vscode_1.workspace.rootPath) {
        return;
    }
    const disposables = [];
    context.subscriptions
        .push(new vscode_1.Disposable(() => vscode_1.Disposable.from(...disposables).dispose()));
    init(disposables)
        .catch(err => console.error(err));
}
exports.activate = activate;
//# sourceMappingURL=ng42Main.js.map