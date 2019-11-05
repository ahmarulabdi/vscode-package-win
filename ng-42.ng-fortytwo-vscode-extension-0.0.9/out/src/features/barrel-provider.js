'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const io = require("../lib/io");
const editor = require("../lib/editor");
const template = require("../lib/template");
const os_1 = require("os");
let DEBUG = false;
const BARREL_TEMPLATE = {
    header: '// start:ng42.barrel',
    footer: '// end:ng42.barrel'
};
var BarrelType;
(function (BarrelType) {
    BarrelType[BarrelType["All"] = 0] = "All";
    BarrelType[BarrelType["Files"] = 1] = "Files";
    BarrelType[BarrelType["Directories"] = 2] = "Directories";
})(BarrelType || (BarrelType = {}));
const defaultSettings = {
    barrelName: 'index.ts',
    itemTemplate: `export * from './$asset_name';`,
    footerTemplate: [],
    headerTemplate: [],
    extensions: ['.ts']
};
let settings;
class BarrelProvider {
    activate(context) {
        if (DEBUG)
            console.log("Barreler active...");
        let subscriptions = context.subscriptions;
        settings = this.readSettings();
        this.barrelAllCmd = vscode.commands.registerCommand(BarrelProvider.barrelAllCmdId, this.barrelAll.bind(this));
        this.barrelFilesCmd = vscode.commands.registerCommand(BarrelProvider.barrelFilesCmdId, this.barrelFiles.bind(this));
        this.barrelDirectoryCmd = vscode.commands.registerCommand(BarrelProvider.barrelDirectoryCmdId, this.barrelDirectories.bind(this));
        subscriptions.push(this);
    }
    dispose() {
        this.barrelAllCmd.dispose();
        this.barrelFilesCmd.dispose();
        this.barrelDirectoryCmd.dispose();
    }
    barrelAll(uri) {
        return this.createBarrel(uri, BarrelType.All);
    }
    barrelFiles(uri) {
        return this.createBarrel(uri, BarrelType.Files);
    }
    barrelDirectories(uri) {
        return this.createBarrel(uri, BarrelType.Directories);
    }
    createBarrel(uri, barrelType) {
        if (!uri)
            return editor.showError('No directory selected in the sidebar explorer.');
        const srcPath = uri.fsPath;
        const barrelName = settings.barrelName;
        const barrelPath = io.getFullPath(srcPath, barrelName);
        if (io.exists(barrelPath)) {
            return editor.showError(`${barrelName} already exists at this location.`);
        }
        return this.getArtifacts(srcPath, barrelType)
            .then(artifacts => this.createBody(artifacts))
            .then(body => io.writeFile(barrelPath, body))
            .then(() => editor.showAndOpen(barrelPath))
            .catch(err => editor.showError(err));
    }
    readSettings() {
        return defaultSettings;
    }
    getArtifacts(srcPath, barrelType) {
        let artifacts = [];
        switch (barrelType) {
            case BarrelType.All:
                const files = io.getFiles(srcPath, settings.extensions);
                const directories = io.getDirectories(srcPath);
                artifacts.push(...files, ...directories);
                break;
            case BarrelType.Files:
                artifacts.push(...io.getFiles(srcPath, settings.extensions));
                break;
            case BarrelType.Directories:
                artifacts.push(...io.getDirectories(srcPath));
                break;
        }
        return Promise.resolve(artifacts);
    }
    createItem(barrelTemplate, asset) {
        const itemTemplate = template.hydrate(barrelTemplate, asset);
        return itemTemplate;
    }
    createBody(artifacts) {
        const rendered = artifacts
            .map(art => this.createItem(settings.itemTemplate, art));
        let body = [
            BARREL_TEMPLATE.header,
            settings.headerTemplate,
            ...rendered,
            settings.footerTemplate,
            BARREL_TEMPLATE.footer
        ];
        return body.join(os_1.EOL);
    }
}
BarrelProvider.barrelAllCmdId = 'ng42.BarrelProvider.barrelAll';
BarrelProvider.barrelFilesCmdId = 'ng42.BarrelProvider.barrelFiles';
BarrelProvider.barrelDirectoryCmdId = 'ng42.BarrelProvider.barrelDirectory';
exports.default = BarrelProvider;
//# sourceMappingURL=barrel-provider.js.map