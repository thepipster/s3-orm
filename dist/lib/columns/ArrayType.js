"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayType = void 0;
const Logger_1 = __importDefault(require("../utils/Logger"));
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
class ArrayType {
    static mock() {
        return chance.n(chance.word, 5);
    }
    static encode(val) {
        return JSON.stringify(val);
    }
    static decode(val) {
        try {
            return JSON.parse(val);
        }
        catch (err) {
            Logger_1.default.error(`Error decoding json string ${val}`);
        }
        return null;
    }
}
exports.ArrayType = ArrayType;
ArrayType.isNumeric = false;
ArrayType.typeName = "array";
//# sourceMappingURL=ArrayType.js.map