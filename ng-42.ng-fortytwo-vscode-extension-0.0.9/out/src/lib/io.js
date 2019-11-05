"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function getFullPath(srcPath, filename) {
    return path.join(srcPath, filename);
}
exports.getFullPath = getFullPath;
function getDirectories(srcPath) {
    return fs.readdirSync(srcPath)
        .filter((file) => {
        const stat = fs.statSync(getFullPath(srcPath, file));
        return stat.isDirectory();
    });
}
exports.getDirectories = getDirectories;
function getFiles(srcPath, exts) {
    let files = fs.readdirSync(srcPath)
        .filter((file) => {
        const filePath = getFullPath(srcPath, file);
        const stat = fs.statSync(filePath);
        const ext = path.extname(file);
        const isEnabledType = !!exts.find(x => x === ext);
        return stat.isFile() && isEnabledType;
    })
        .map(file => {
        return exts.reduce((filename, ext) => {
            return path.basename(filename, ext);
        }, file);
    });
    return files;
}
exports.getFiles = getFiles;
function exists(filePath) {
    return fs.existsSync(filePath);
}
exports.exists = exists;
function writeFile(outPath, output) {
    return fs.writeFileSync(outPath, output);
}
exports.writeFile = writeFile;
//# sourceMappingURL=io.js.map