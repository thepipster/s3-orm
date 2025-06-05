"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UuidType = void 0;
//import {uniqueId} from "lodash";
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
class UuidType {
    static mock() {
        return chance.guid({ version: 4 });
    }
    static encode(val) {
        if (val === null || val === undefined)
            return '';
        return String(val);
    }
    static decode(val) {
        return val;
    }
}
exports.UuidType = UuidType;
UuidType.isNumeric = false;
UuidType.typeName = "uuid";
//# sourceMappingURL=UuidType.js.map