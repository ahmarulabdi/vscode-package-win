"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
class ImportsProvider {
    constructor(context) {
        this.context = context;
    }
    dispose() { }
    importFiles(uri) {
        const srcPath = uri.fsPath;
        const contents = ts.sys.readFile(srcPath);
        const src = ts.preProcessFile(contents);
    }
    importDirectories() { }
    importAll() { }
}
exports.ImportsProvider = ImportsProvider;
//# sourceMappingURL=import-provider.js.map