"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanType = void 0;
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
class BooleanType {
    static mock() {
        return chance.bool();
    }
    /**
     * Store boolean values as a 1 or 0 to save space
     * @param val
     * @returns
     */
    static encode(val) {
        let res = '0';
        if (val == 'true') {
            res = '1';
        }
        else if (val === true) {
            res = '1';
        }
        else if (val == 1) {
            res = '1';
        }
        //Logger.debug(`BooleanType.encode ${val} --> ${res}`);
        return res;
    }
    static decode(val) {
        if (val == '1') {
            return true;
        }
        return false;
    }
}
exports.BooleanType = BooleanType;
BooleanType.isNumeric = false;
BooleanType.typeName = "boolean";
exports.default = new BooleanType();
//# sourceMappingURL=BooleanType.js.map