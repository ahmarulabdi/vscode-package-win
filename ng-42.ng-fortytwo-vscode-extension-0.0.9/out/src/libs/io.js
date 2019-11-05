"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const glob = require("glob");
function getFullPath(srcPath, filename) {
    return path.join(srcPath, filename);
}
exports.getFullPath = getFullPath;
function getDirectories(srcPath, excludes) {
    const results = glob.sync('**/', {
        cwd: srcPath,
        ignore: excludes,
        nodir: false
    }).map(path => ({
        path: path.substring(0, path.length - 1),
        isDirectory: true
    }));
    return results;
}
exports.getDirectories = getDirectories;
function getFiles(srcPath, includes, excludes) {
    const results = glob.sync(includes, {
        cwd: srcPath,
        ignore: excludes,
        nodir: true
    }).map(result => ({
        path: path.parse(result).name,
        isDirectory: false
    }));
    return results;
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