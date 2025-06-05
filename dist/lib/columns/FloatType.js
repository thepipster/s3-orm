"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatType = void 0;
const lodash_1 = require("lodash");
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
class FloatType {
    static mock() {
        return chance.floating({ min: 0, max: 1000000 });
    }
    static encode(val) {
        if (!val || val === null || val === undefined) {
            return '';
        }
        return val + '';
    }
    static decode(val) {
        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a float column and got an invalid value: ${val}`);
        }
        let numb = parseFloat(val);
        if ((0, lodash_1.isFinite)(numb)) {
            return numb;
        }
        return null;
    }
}
exports.FloatType = FloatType;
FloatType.isNumeric = true;
FloatType.typeName = "float";
//# sourceMappingURL=FloatType.js.map