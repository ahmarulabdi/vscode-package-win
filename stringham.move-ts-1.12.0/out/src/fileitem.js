"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const fs = require("fs-extra-promise");
const path = require("path");
class FileItem {
    constructor(sourcePath, targetPath, isDir) {
        this.sourcePath = sourcePath;
        this.targetPath = targetPath;
        this.isDir = isDir;
    }
    exists() {
        return fs.existsSync(this.targetPath);
    }
    static moveMultiple(items, index) {
        return items[0].ensureDir().then(() => {
            const sourceDir = path.dirname(items[0].sourcePath);
            const targetDir = path.dirname(items[0].targetPath);
            const fileNames = items.map(i => path.basename(i.sourcePath));
            return index.updateDirImports(sourceDir, targetDir, fileNames)
                .then(() => {
                const promises = items.map(i => fs.renameAsync(i.sourcePath, i.targetPath));
                return Promise.all(promises);
            })
                .then(() => {
                return index.updateMovedDir(sourceDir, targetDir, fileNames);
            })
                .then(() => {
                return items;
            });
        });
    }
    move(index) {
        return this.ensureDir()
            .then(() => {
            if (this.isDir) {
                return index.updateDirImports(this.sourcePath, this.targetPath)
                    .then(() => {
                    return fs.renameAsync(this.sourcePath, this.targetPath);
                })
                    .then(() => {
                    return index.updateMovedDir(this.sourcePath, this.targetPath);
                })
                    .then(() => {
                    return this;
                });
            }
            else {
                return index.updateImports(this.sourcePath, this.targetPath)
                    .then(() => {
                    return fs.renameAsync(this.sourcePath, this.targetPath);
                })
                    .then(() => {
                    return index.updateMovedFile(this.sourcePath, this.targetPath);
                })
                    .then(() => {
                    return this;
                });
            }
        })
            .then(() => {
            return this;
        })
            .catch(e => {
            console.log('error in move', e);
        });
    }
    ensureDir() {
        return fs.ensureDirAsync(path.dirname(this.targetPath));
    }
}
exports.FileItem = FileItem;
//# sourceMappingURL=fileitem.js.map