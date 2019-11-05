'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const barrel_provider_1 = require("./features/barrel-provider");
function activate(context) {
    let barreler = new barrel_provider_1.default();
    barreler.activate(context);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map