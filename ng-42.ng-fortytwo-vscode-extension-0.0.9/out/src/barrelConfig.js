"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
class BarrelConfig {
    constructor(config) {
        this.barrelName = config.get('barrelName');
        this.eol = this.getEndOfLine(config.get('eol'));
        this.include = config.get('include');
        this.exclude = config.get('exclude');
        this.fileTemplate = this.getString(config.get('fileTemplate'));
        this.directoryTemplate = this.getString(config.get('directoryTemplate'));
        this.headerTemplate = this.getString(config.get('headerTemplate'));
        this.footerTemplate = this.getString(config.get('footerTemplate'));
        this.useTemplates = config.get('useTemplates');
        this.menus = config.get('menus');
    }
    getEndOfLine(value) {
        if (value === 'os') {
            return os_1.EOL;
        }
        return value;
    }
    getString(value) {
        if (typeof value === 'string') {
            return os_1.EOL;
        }
        else {
            return value.join(this.eol);
        }
    }
}
exports.BarrelConfig = BarrelConfig;
//# sourceMappingURL=barrelConfig.js.map