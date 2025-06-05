"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonType = void 0;
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
const Logger_1 = __importDefault(require("../utils/Logger"));
class JsonType {
    static mock() {
        return {
            a: chance.integer({ min: -200, max: 200 }),
            b: chance.name(),
            c: chance.d100(),
            d: chance.floating({ min: 0, max: 1000 })
        };
    }
    static encode(val) {
        //Logger.debug(`Encoded json to >>${JSON.stringify(val)}<< from `, val);
        return JSON.stringify(val);
    }
    static decode(val) {
        try {
            //Logger.debug(`Decodeed json to >>${val}<< from `, JSON.parse(val));
            return JSON.parse(val);
        }
        catch (err) {
            Logger_1.default.error(`Error decoding json string ${val}`);
        }
        return null;
    }
}
exports.JsonType = JsonType;
JsonType.isNumeric = false;
JsonType.typeName = "json";
//# sourceMappingURL=JsonType.js.map