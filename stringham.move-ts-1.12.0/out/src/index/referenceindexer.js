"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra-promise");
const path = require("path");
const ts = require("typescript");
const vscode = require("vscode");
const referenceindex_1 = require("./referenceindex");
const minimatch = require('minimatch');
const BATCH_SIZE = 50;
function isInDir(dir, p) {
    const relative = path.relative(dir, p);
    return !referenceindex_1.isPathToAnotherDir(relative);
}
exports.isInDir = isInDir;
function asUnix(fsPath) {
    return fsPath.replace(/\\/g, '/');
}
exports.asUnix = asUnix;
class ReferenceIndexer {
    constructor() {
        this.index = new referenceindex_1.ReferenceIndex();
        this.output = vscode.window.createOutputChannel('move-ts');
        this.packageNames = {};
        this.extensions = ['.ts', '.tsx'];
        this.paths = [];
        this.filesToExclude = [];
        this.isInitialized = false;
    }
    init(progress) {
        this.index = new referenceindex_1.ReferenceIndex();
        return this.readPackageNames().then(() => {
            return this.scanAll(progress)
                .then(() => {
                return this.attachFileWatcher();
            })
                .then(() => {
                console.log('move-ts initialized');
                this.isInitialized = true;
            });
        });
    }
    conf(property, defaultValue) {
        return vscode.workspace.getConfiguration('movets').get(property, defaultValue);
    }
    readPackageNames() {
        this.packageNames = {};
        this.tsconfigs = {};
        let seenPackageNames = {};
        const packagePromise = vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1000).then(files => {
            const promises = files.map(file => {
                return fs.readFileAsync(file.fsPath, 'utf-8').then(content => {
                    try {
                        let json = JSON.parse(content);
                        if (json.name) {
                            if (seenPackageNames[json.name]) {
                                delete this.packageNames[json.name];
                                return;
                            }
                            seenPackageNames[json.name] = true;
                            this.packageNames[json.name] = path.dirname(file.fsPath);
                        }
                    }
                    catch (e) {
                    }
                });
            });
            return Promise.all(promises);
        });
        const tsConfigPromise = vscode.workspace.findFiles('**/tsconfig{.json,.build.json}', '**/node_modules/**', 1000).then(files => {
            const promises = files.map(file => {
                return fs.readFileAsync(file.fsPath, 'utf-8').then(content => {
                    try {
                        const config = ts.parseConfigFileTextToJson(file.fsPath, content);
                        if (config.config) {
                            this.tsconfigs[file.fsPath] = config.config;
                        }
                    }
                    catch (e) {
                    }
                });
            });
            return Promise.all(promises);
        });
        return Promise.all([packagePromise, tsConfigPromise]);
    }
    startNewMoves(moves) {
        this.output.appendLine('--------------------------------------------------');
        this.output.appendLine(`Moving:`);
        for (let i = 0; i < moves.length; i++) {
            this.output.appendLine(`           ${moves[i].sourcePath} -> ${moves[i].targetPath}`);
        }
        this.output.appendLine('--------------------------------------------------');
        this.output.appendLine('Files changed:');
    }
    startNewMove(from, to) {
        this.output.appendLine('--------------------------------------------------');
        this.output.appendLine(`Moving ${from} -> ${to}`);
        this.output.appendLine('--------------------------------------------------');
        this.output.appendLine('Files changed:');
    }
    get filesToScanGlob() {
        const filesToScan = this.conf('filesToScan', ['**/*.ts', '**/*.tsx']);
        if (filesToScan.length == 0) {
            return '';
        }
        return filesToScan.length == 1 ? filesToScan[0] : `{${filesToScan.join(',')}}`;
    }
    scanAll(progress) {
        this.index = new referenceindex_1.ReferenceIndex();
        const start = Date.now();
        return vscode.workspace.findFiles(this.filesToScanGlob, '**/node_modules/**', 100000)
            .then(files => {
            return this.processWorkspaceFiles(files, false, progress);
        })
            .then(() => {
            console.log('scan finished in ' + (Date.now() - start) + 'ms');
        });
    }
    attachFileWatcher() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        if (this.changeDocumentEvent) {
            this.changeDocumentEvent.dispose();
        }
        this.changeDocumentEvent = vscode.workspace.onDidChangeTextDocument(changeEvent => {
            addBatch(changeEvent.document.uri, changeEvent.document);
        });
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(this.filesToScanGlob);
        const watcher = this.fileWatcher;
        const batch = [];
        const documents = [];
        let batchTimeout = undefined;
        const batchHandler = () => {
            batchTimeout = undefined;
            vscode.workspace.findFiles(this.filesToScanGlob, '**/node_modules/**', 10000).then(files => {
                const b = new Set(batch.splice(0, batch.length));
                if (b.size) {
                    this.processWorkspaceFiles(files.filter(f => b.has(f.fsPath)), true);
                }
                const docs = documents.splice(0, documents.length);
                if (docs.length) {
                    this.processDocuments(docs);
                }
            });
        };
        const addBatch = (file, doc) => {
            if (doc) {
                documents.push(doc);
            }
            else {
                batch.push(file.fsPath);
            }
            if (batchTimeout) {
                clearTimeout(batchTimeout);
                batchTimeout = undefined;
            }
            batchTimeout = setTimeout(batchHandler, 250);
        };
        watcher.onDidChange(addBatch);
        watcher.onDidCreate(addBatch);
        watcher.onDidDelete((file) => {
            this.index.deleteByPath(file.fsPath);
        });
    }
    getEdits(path, text, replacements, fromPath) {
        const edits = [];
        const relativeReferences = this.getRelativeReferences(text, fromPath || path);
        replacements.forEach(replacement => {
            const before = replacement[0];
            const after = replacement[1];
            if (before == after) {
                return;
            }
            const beforeReference = this.resolveRelativeReference(fromPath || path, before);
            const seen = {};
            const beforeReplacements = relativeReferences.filter(ref => {
                return this.resolveRelativeReference(fromPath || path, ref.specifier) == beforeReference;
            });
            beforeReplacements.forEach(beforeReplacement => {
                const edit = {
                    start: beforeReplacement.location.start + 1,
                    end: beforeReplacement.location.end - 1,
                    replacement: after,
                };
                edits.push(edit);
            });
        });
        return edits;
    }
    applyEdits(text, edits) {
        const replaceBetween = (str, start, end, replacement) => {
            return str.substr(0, start) + replacement + str.substr(end);
        };
        edits.sort((a, b) => {
            return a.start - b.start;
        });
        let editOffset = 0;
        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            text = replaceBetween(text, edit.start + editOffset, edit.end + editOffset, edit.replacement);
            editOffset += edit.replacement.length - (edit.end - edit.start);
        }
        return text;
    }
    replaceReferences(filePath, getReplacements, fromPath) {
        if (!this.conf('openEditors', false)) {
            return fs.readFileAsync(filePath, 'utf8').then(text => {
                const replacements = getReplacements(text);
                const edits = this.getEdits(filePath, text, replacements, fromPath);
                if (edits.length == 0) {
                    return Promise.resolve();
                }
                const newText = this.applyEdits(text, edits);
                this.output.show();
                this.output.appendLine(filePath);
                return fs.writeFileAsync(filePath, newText, 'utf-8').then(() => {
                    this.processFile(newText, filePath, true);
                });
            });
        }
        else {
            function attemptEdit(edit, attempts = 0) {
                return vscode.workspace.applyEdit(edit).then(success => {
                    if (!success && attempts < 5) {
                        console.log(attempts);
                        return attemptEdit(edit, attempts + 1);
                    }
                });
            }
            return vscode.workspace.openTextDocument(filePath).then((doc) => {
                const text = doc.getText();
                const replacements = getReplacements(text);
                const rawEdits = this.getEdits(filePath, text, replacements);
                const edits = rawEdits.map((edit) => {
                    return vscode.TextEdit.replace(new vscode.Range(doc.positionAt(edit.start), doc.positionAt(edit.end)), edit.replacement);
                });
                if (edits.length > 0) {
                    this.output.show();
                    this.output.appendLine(filePath);
                    const edit = new vscode.WorkspaceEdit();
                    edit.set(doc.uri, edits);
                    return attemptEdit(edit).then(() => {
                        const newText = this.applyEdits(text, rawEdits);
                        this.processFile(newText, filePath, true);
                    });
                }
                else {
                    return Promise.resolve();
                }
            });
        }
    }
    updateMovedFile(from, to) {
        return this
            .replaceReferences(to, (text) => {
            const references = Array.from(new Set(this.getRelativeImportSpecifiers(text, from)));
            const replacements = references.map((reference) => {
                const absReference = this.resolveRelativeReference(from, reference);
                const newReference = this.getRelativePath(to, absReference);
                return [reference, newReference];
            });
            return replacements;
        }, from)
            .then(() => {
            this.index.deleteByPath(from);
        });
    }
    updateMovedDir(from, to, fileNames = []) {
        const relative = vscode.workspace.asRelativePath(to);
        const glob = this.filesToScanGlob;
        const whiteList = new Set(fileNames);
        return vscode.workspace.findFiles(relative + '/**', undefined, 100000).then(files => {
            const promises = files
                .filter(file => {
                if (whiteList.size > 0) {
                    return minimatch(file.fsPath, glob) &&
                        whiteList.has(path.relative(to, file.fsPath).split(path.sep)[0]);
                }
                return minimatch(file.fsPath, glob);
            })
                .map(file => {
                const originalPath = path.resolve(from, path.relative(to, file.fsPath));
                return this.replaceReferences(file.fsPath, (text) => {
                    const references = this.getRelativeImportSpecifiers(text, file.fsPath);
                    const change = references
                        .filter(p => {
                        const abs = this.resolveRelativeReference(originalPath, p);
                        if (whiteList.size > 0) {
                            const name = path.relative(from, abs).split(path.sep)[0];
                            if (whiteList.has(name)) {
                                return false;
                            }
                            for (let i = 0; i < this.extensions.length; i++) {
                                if (whiteList.has(name + this.extensions[i])) {
                                    return false;
                                }
                            }
                            return true;
                        }
                        return referenceindex_1.isPathToAnotherDir(path.relative(from, abs));
                    })
                        .map((p) => {
                        const abs = this.resolveRelativeReference(originalPath, p);
                        const relative = this.getRelativePath(file.fsPath, abs);
                        return [p, relative];
                    });
                    return change;
                }, originalPath);
            });
            return Promise.all(promises);
        });
    }
    updateDirImports(from, to, fileNames = []) {
        const whiteList = new Set(fileNames);
        const affectedFiles = this.index.getDirReferences(from, fileNames);
        const promises = affectedFiles.map(reference => {
            return this.replaceReferences(reference.path, (text) => {
                const imports = this.getRelativeImportSpecifiers(text, reference.path);
                const change = imports
                    .filter(p => {
                    const abs = this.resolveRelativeReference(reference.path, p);
                    if (fileNames.length > 0) {
                        const name = path.relative(from, abs).split(path.sep)[0];
                        if (whiteList.has(name)) {
                            return true;
                        }
                        for (let i = 0; i < this.extensions.length; i++) {
                            if (whiteList.has(name + this.extensions[i])) {
                                return true;
                            }
                        }
                        return false;
                    }
                    return !referenceindex_1.isPathToAnotherDir(path.relative(from, abs));
                })
                    .map((p) => {
                    const abs = this.resolveRelativeReference(reference.path, p);
                    const relative = path.relative(from, abs);
                    const newabs = path.resolve(to, relative);
                    const changeTo = this.getRelativePath(reference.path, newabs);
                    return [p, changeTo];
                });
                return change;
            });
        });
        return Promise.all(promises);
    }
    removeExtension(filePath) {
        let ext = path.extname(filePath);
        if (ext == '.ts' && filePath.endsWith('.d.ts')) {
            ext = '.d.ts';
        }
        if (this.extensions.indexOf(ext) >= 0) {
            return filePath.slice(0, -ext.length);
        }
        return filePath;
    }
    removeIndexSuffix(filePath) {
        if (!this.conf('removeIndexSuffix', true)) {
            return filePath;
        }
        const indexSuffix = '/index';
        if (filePath.endsWith(indexSuffix)) {
            return filePath.slice(0, -indexSuffix.length);
        }
        return filePath;
    }
    updateImports(from, to) {
        const affectedFiles = this.index.getReferences(from);
        const promises = affectedFiles.map(filePath => {
            return this.replaceReferences(filePath.path, (text) => {
                let relative = this.getRelativePath(filePath.path, from);
                relative = this.removeExtension(relative);
                let newRelative = this.getRelativePath(filePath.path, to);
                newRelative = this.removeExtension(newRelative);
                newRelative = this.removeIndexSuffix(newRelative);
                return [[relative, newRelative]];
            });
        });
        return Promise.all(promises).catch(e => {
            console.log(e);
        });
    }
    processWorkspaceFiles(files, deleteByFile = false, progress) {
        files = files.filter((f) => {
            return f.fsPath.indexOf('typings') === -1 && f.fsPath.indexOf('node_modules') === -1 &&
                f.fsPath.indexOf('jspm_packages') === -1;
        });
        return new Promise(resolve => {
            let index = 0;
            const next = () => {
                for (let i = 0; i < BATCH_SIZE && index < files.length; i++) {
                    const file = files[index++];
                    try {
                        const data = fs.readFileSync(file.fsPath, 'utf8');
                        this.processFile(data, file.fsPath, deleteByFile);
                    }
                    catch (e) {
                        console.log('Failed to load file', e);
                    }
                }
                if (progress) {
                    progress.report({ message: 'move-ts indexing... ' + index + '/' + files.length + ' indexed' });
                }
                if (index < files.length) {
                    setTimeout(next, 0);
                }
                else {
                    resolve();
                }
            };
            next();
        });
    }
    processDocuments(documents) {
        documents = documents.filter((doc) => {
            return doc.uri.fsPath.indexOf('typings') === -1 && doc.uri.fsPath.indexOf('node_modules') === -1 &&
                doc.uri.fsPath.indexOf('jspm_packages') === -1;
        });
        return new Promise(resolve => {
            let index = 0;
            const next = () => {
                for (let i = 0; i < BATCH_SIZE && index < documents.length; i++) {
                    const doc = documents[index++];
                    try {
                        const data = doc.getText();
                        this.processFile(data, doc.uri.fsPath, false);
                    }
                    catch (e) {
                        console.log('Failed to load file', e);
                    }
                }
                if (index < documents.length) {
                    setTimeout(next, 0);
                }
                else {
                    resolve();
                }
            };
            next();
        });
    }
    doesFileExist(filePath) {
        if (fs.existsSync(filePath)) {
            return true;
        }
        for (let i = 0; i < this.extensions.length; i++) {
            if (fs.existsSync(filePath + this.extensions[i])) {
                return true;
            }
        }
        return false;
    }
    getRelativePath(from, to) {
        const configInfo = this.getTsConfig(from);
        if (configInfo) {
            const config = configInfo.config;
            const configPath = configInfo.configPath;
            if (config.compilerOptions && config.compilerOptions.paths && config.compilerOptions.baseUrl) {
                const baseUrl = path.resolve(path.dirname(configPath), config.compilerOptions.baseUrl);
                for (let p in config.compilerOptions.paths) {
                    const paths = config.compilerOptions.paths[p];
                    for (let i = 0; i < paths.length; i++) {
                        const mapped = paths[i].slice(0, -1);
                        const mappedDir = path.resolve(baseUrl, mapped);
                        if (isInDir(mappedDir, to)) {
                            return asUnix(p.slice(0, -1) + path.relative(mappedDir, to));
                        }
                    }
                }
            }
        }
        for (let packageName in this.packageNames) {
            const packagePath = this.packageNames[packageName];
            if (isInDir(packagePath, to) && !isInDir(packagePath, from)) {
                return asUnix(path.join(packageName, path.relative(packagePath, to)));
            }
        }
        const relativeToTsConfig = this.conf('relativeToTsconfig', false);
        if (relativeToTsConfig && configInfo) {
            const configDir = path.dirname(configInfo.configPath);
            if (isInDir(configDir, from) && isInDir(configDir, to)) {
                return asUnix(path.relative(configDir, to));
            }
        }
        let relative = path.relative(path.dirname(from), to);
        if (!relative.startsWith('.')) {
            relative = './' + relative;
        }
        return asUnix(relative);
    }
    resolveRelativeReference(fsPath, reference) {
        if (reference.startsWith('.')) {
            return path.resolve(path.dirname(fsPath), reference);
        }
        else {
            const configInfo = this.getTsConfig(fsPath);
            if (configInfo) {
                const config = configInfo.config;
                const configPath = configInfo.configPath;
                const relativeToTsConfig = this.conf('relativeToTsconfig', false);
                if (relativeToTsConfig && configPath) {
                    const check = path.resolve(path.dirname(configPath), reference);
                    if (this.doesFileExist(check)) {
                        return check;
                    }
                }
                if (config.compilerOptions && config.compilerOptions.paths && config.compilerOptions.baseUrl) {
                    const baseUrl = path.resolve(path.dirname(configPath), config.compilerOptions.baseUrl);
                    for (let p in config.compilerOptions.paths) {
                        if (p.endsWith('*') && reference.startsWith(p.slice(0, -1))) {
                            const paths = config.compilerOptions.paths[p];
                            for (let i = 0; i < paths.length; i++) {
                                const mapped = paths[i].slice(0, -1);
                                const mappedDir = path.resolve(baseUrl, mapped);
                                const potential = path.join(mappedDir, reference.substr(p.slice(0, -1).length));
                                if (this.doesFileExist(potential)) {
                                    return potential;
                                }
                            }
                            if (config.compilerOptions.paths[p].length == 1) {
                                const mapped = config.compilerOptions.paths[p][0].slice(0, -1);
                                const mappedDir = path.resolve(path.dirname(configPath), mapped);
                                return path.join(mappedDir, reference.substr(p.slice(0, -1).length));
                            }
                        }
                    }
                }
            }
            for (let packageName in this.packageNames) {
                if (reference.startsWith(packageName + '/')) {
                    return path.resolve(this.packageNames[packageName], reference.substr(packageName.length + 1));
                }
            }
        }
        return '';
    }
    getTsConfig(filePath) {
        let prevDir = filePath;
        let dir = path.dirname(filePath);
        while (dir != prevDir) {
            const tsConfigPaths = [path.join(dir, 'tsconfig.json'), path.join(dir, 'tsconfig.build.json')];
            const tsConfigPath = tsConfigPaths.find(p => this.tsconfigs.hasOwnProperty(p));
            if (tsConfigPath) {
                return { config: this.tsconfigs[tsConfigPath], configPath: tsConfigPath };
            }
            prevDir = dir;
            dir = path.dirname(dir);
        }
        return null;
    }
    getRelativeImportSpecifiers(data, filePath) {
        return this.getRelativeReferences(data, filePath).map(ref => ref.specifier);
    }
    getReferences(fileName, data) {
        const result = [];
        const file = ts.createSourceFile(fileName, data, ts.ScriptTarget.Latest);
        file.statements.forEach((node) => {
            if (ts.isImportDeclaration(node)) {
                if (ts.isStringLiteral(node.moduleSpecifier)) {
                    result.push({
                        specifier: node.moduleSpecifier.text,
                        location: {
                            start: node.moduleSpecifier.getStart(file),
                            end: node.moduleSpecifier.getEnd(),
                        },
                    });
                }
            }
        });
        return result;
    }
    getRelativeReferences(data, filePath) {
        const references = new Set();
        let cachedConfig = undefined;
        const getConfig = () => {
            if (cachedConfig === undefined) {
                cachedConfig = this.getTsConfig(filePath);
            }
            return cachedConfig;
        };
        const imports = this.getReferences(filePath, data);
        for (let i = 0; i < imports.length; i++) {
            const importModule = imports[i].specifier;
            if (importModule.startsWith('.')) {
                references.add(importModule);
            }
            else {
                const resolved = this.resolveRelativeReference(filePath, importModule);
                if (resolved.length > 0) {
                    references.add(importModule);
                }
            }
        }
        return imports.filter(i => references.has(i.specifier));
    }
    processFile(data, filePath, deleteByFile = false) {
        if (deleteByFile) {
            this.index.deleteByPath(filePath);
        }
        const fsPath = this.removeExtension(filePath);
        const references = this.getRelativeImportSpecifiers(data, fsPath);
        for (let i = 0; i < references.length; i++) {
            let referenced = this.resolveRelativeReference(filePath, references[i]);
            for (let j = 0; j < this.extensions.length; j++) {
                const ext = this.extensions[j];
                if (!referenced.endsWith(ext) && fs.existsSync(referenced + ext)) {
                    referenced += ext;
                }
            }
            this.index.addReference(referenced, filePath);
        }
    }
}
exports.ReferenceIndexer = ReferenceIndexer;
//# sourceMappingURL=referenceindexer.js.map