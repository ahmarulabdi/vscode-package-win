"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function isPathToAnotherDir(path) {
    return path.startsWith('../') || path.startsWith('..\\');
}
exports.isPathToAnotherDir = isPathToAnotherDir;
class ReferenceIndex {
    constructor() {
        this.referencedBy = {}; // path -> all of the files that reference it
        this.references = {}; // path -> all of the files that it references
    }
    // path references the reference
    addReference(reference, path) {
        if (!this.referencedBy.hasOwnProperty(reference)) {
            this.referencedBy[reference] = [];
        }
        if (!this.references.hasOwnProperty(path)) {
            this.references[path] = [];
        }
        if (!this.references[path].some(ref => {
            return ref.path == reference;
        })) {
            this.references[path].push({ path: reference });
        }
        if (!this.referencedBy[reference].some(reference => {
            return reference.path == path;
        })) {
            this.referencedBy[reference].push({
                path,
            });
        }
    }
    deleteByPath(path) {
        if (this.references.hasOwnProperty(path)) {
            this.references[path].forEach(p => {
                if (this.referencedBy.hasOwnProperty(p.path)) {
                    this.referencedBy[p.path] = this.referencedBy[p.path].filter(reference => {
                        return reference.path != path;
                    });
                }
            });
            delete this.references[path];
        }
    }
    // get a list of all of the files outside of this directory that reference files
    // inside of this directory.
    getDirReferences(directory, fileNames = []) {
        const result = [];
        const added = new Set();
        const whiteList = new Set(fileNames);
        for (let p in this.referencedBy) {
            if (whiteList.size > 0) {
                const relative = path.relative(directory, p).split(path.sep)[0];
                if (whiteList.has(relative)) {
                    this.referencedBy[p].forEach(reference => {
                        if (added.has(reference.path)) {
                            return;
                        }
                        const relative2 = path.relative(directory, reference.path).split(path.sep)[0];
                        if (!whiteList.has(relative2)) {
                            result.push(reference);
                            added.add(reference.path);
                        }
                    });
                }
            }
            else if (!isPathToAnotherDir(path.relative(directory, p))) {
                this.referencedBy[p].forEach(reference => {
                    if (added.has(reference.path)) {
                        return;
                    }
                    if (isPathToAnotherDir(path.relative(directory, reference.path))) {
                        result.push(reference);
                        added.add(reference.path);
                    }
                });
            }
        }
        return result;
    }
    // get a list of all of the files that reference path
    getReferences(path) {
        if (this.referencedBy.hasOwnProperty(path)) {
            return this.referencedBy[path];
        }
        return [];
    }
}
exports.ReferenceIndex = ReferenceIndex;
//# sourceMappingURL=referenceindex.js.map