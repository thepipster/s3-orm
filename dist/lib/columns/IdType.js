"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdType = void 0;
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
class IdType {
    static mock() {
        return chance.integer({ min: 1, max: 20000 });
    }
    static encode(val) {
        if (val === null || val === undefined) {
            throw new Error('The id value cannot be null or undefined');
        }
        return String(val);
    }
    static decode(val) {
        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a id column and got an invalid value: ${val}`);
        }
        let numb = parseInt(val);
        if (isFinite(numb)) {
            return numb;
        }
        return null;
    }
}
exports.IdType = IdType;
//private static idCounters: Map<string, number> = new Map();
IdType.isNumeric = true;
IdType.typeName = "id";
exports.default = new IdType();
//# sourceMappingURL=IdType.js.map