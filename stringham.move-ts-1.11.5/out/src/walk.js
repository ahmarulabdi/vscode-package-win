"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function walk(node, fn) {
    if (fn(node)) {
        return true;
    }
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
        if (walk(children[i], fn)) {
            return true;
        }
    }
    return false;
}
exports.walk = walk;
;
//# sourceMappingURL=walk.js.map