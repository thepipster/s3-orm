"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = Entity;
require("reflect-metadata");
const ModelMetaStore_1 = require("./ModelMetaStore");
function Entity(params) {
    return function (target) {
        const className = target.name;
        const modelOptions = params || {};
        ModelMetaStore_1.ModelMetaStore.addColumnMeta(className, modelOptions);
        return target;
    };
}
//# sourceMappingURL=Entity.js.map