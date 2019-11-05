'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
const ramda_1 = require("ramda");
const vscode_nls_1 = require("vscode-nls");
const io = require("../libs/io");
const template_1 = require("../libs/template");
const localize = vscode_nls_1.loadMessageBundle();
var BarrelType;
(function (BarrelType) {
    BarrelType[BarrelType["All"] = 0] = "All";
    BarrelType[BarrelType["Files"] = 1] = "Files";
    BarrelType[BarrelType["Directories"] = 2] = "Directories";
})(BarrelType || (BarrelType = {}));
;
;
class BarrelProvider {
    constructor(options, outputChannel) {
        this.options = options;
        this.outputChannel = outputChannel;
        this.disposables = BarrelProvider.Commands
            .map(({ commandId, method }) => vscode_1.commands.registerCommand(commandId, method, this));
    }
    static Command(commandId) {
        return (target, key, descriptor) => {
            if (!(typeof descriptor.value === 'function')) {
                throw new Error('not supported');
            }
            BarrelProvider.Commands.push({ commandId, method: descriptor.value });
        };
    }
    static CatchErrors(target, key, descriptor) {
        if (!(typeof descriptor.value === 'function')) {
            throw new Error('not supported');
        }
        const fn = descriptor.value;
        descriptor.value = function (...args) {
            fn.apply(this, args).catch((err) => __awaiter(this, void 0, void 0, function* () {
                let message;
                switch (err.gitErrorCode) {
                    // case 'TARGETED_ERROR':
                    // 	message = localize('localoization key', "Targeted Error Message");
                    // 	break;
                    default:
                        message = (err.stderr || err.message).replace(/^error: /, '');
                        break;
                }
                if (!message) {
                    console.error(err);
                    return;
                }
                const outputChannel = this.outputChannel;
                const openOutputChannelChoice = localize('open NG.42 log', "Open NG.42 Log");
                const choice = yield vscode_1.window.showErrorMessage(message, openOutputChannelChoice);
                if (choice === openOutputChannelChoice) {
                    outputChannel.show();
                }
            }));
        };
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
    barrelAll(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createBarrel(uri, BarrelType.All, this.options);
        });
    }
    barrelFiles(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createBarrel(uri, BarrelType.Files, this.options);
        });
    }
    barrelDirectories(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createBarrel(uri, BarrelType.Directories, this.options);
        });
    }
    createBarrel(uri, barrelType, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!uri)
                throw new Error('No directory selected in the sidebar explorer.');
            const srcPath = uri.fsPath;
            const barrelName = config.barrelName;
            const barrelPath = io.getFullPath(srcPath, barrelName);
            const fileExists = io.exists(barrelPath);
            if (fileExists) {
                throw new Error(`${barrelName} already exists at this location.`);
            }
            return yield this.getArtifacts(srcPath, barrelType)
                .then(artifacts => {
                const body = this.createBody(artifacts, config);
                io.writeFile(barrelPath, body);
                return true;
            })
                .catch((err) => { throw err; });
        });
    }
    getArtifacts(srcPath, barrelType) {
        return __awaiter(this, void 0, void 0, function* () {
            let artifacts = [];
            const includes = ramda_1.keys(this.options.include);
            const excludes = ramda_1.keys(this.options.exclude);
            switch (barrelType) {
                case BarrelType.All:
                    artifacts.push(...includes
                        .reduce((files, glob) => files
                        .concat(io.getFiles(srcPath, glob, excludes)), []));
                    artifacts.push(...io.getDirectories(srcPath, excludes));
                    break;
                case BarrelType.Files:
                    artifacts.push(...includes
                        .reduce((files, glob) => files
                        .concat(io.getFiles(srcPath, glob, excludes)), []));
                    break;
                case BarrelType.Directories:
                    artifacts.push(...io.getDirectories(srcPath, excludes));
                    break;
            }
            return artifacts;
        });
    }
    createItem(asset, config) {
        return asset.isDirectory
            ? template_1.hydrateTemplate(config.directoryTemplate, asset.path)
            : template_1.hydrateTemplate(config.fileTemplate, asset.path);
    }
    headerTemplate(config) {
        return config.useTemplates.header
            ? [config.headerTemplate]
            : [];
    }
    footerTemplate(config) {
        return config.useTemplates.footer
            ? [config.footerTemplate]
            : [];
    }
    createBody(artifacts, config) {
        const rendered = artifacts
            .map(art => this.createItem(art, config));
        const contents = [
            ...this.headerTemplate(config),
            ...rendered,
            ...this.footerTemplate(config),
            config.eol
        ];
        return contents.join(config.eol);
    }
}
BarrelProvider.Commands = [];
__decorate([
    BarrelProvider.Command('ng42.createBarrel'),
    BarrelProvider.CatchErrors
], BarrelProvider.prototype, "barrelAll", null);
__decorate([
    BarrelProvider.Command('ng42.createFileBarrel'),
    BarrelProvider.CatchErrors
], BarrelProvider.prototype, "barrelFiles", null);
__decorate([
    BarrelProvider.Command('ng42.createDirectoryBarrel'),
    BarrelProvider.CatchErrors
], BarrelProvider.prototype, "barrelDirectories", null);
exports.BarrelProvider = BarrelProvider;
//# sourceMappingURL=barrelProvider.js.map