"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function hydrateTemplate(template, source) {
    return template.replace(/\$asset_name/g, source);
}
exports.hydrateTemplate = hydrateTemplate;
//# sourceMappingURL=template.js.map