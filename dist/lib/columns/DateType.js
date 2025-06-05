"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateType = void 0;
const lodash_1 = require("lodash");
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
class DateType {
    static mock() {
        return chance.date();
    }
    /**
     * Covnert the date to an epoch timestamp for storage
     */
    static encode(val) {
        if (!val || val === null || val === undefined) {
            return '0';
        }
        if (typeof val == "string") {
            val = new Date(val);
        }
        if (val instanceof Date) {
            //return val.toISOString();
            return new Date(val).getTime() + '';
        }
        //Logger.error(`Trying to encode a date column and got an invalid date value: ${val}`, val);
        throw new Error(`Trying to encode a date column and got an invalid date value: ${val}`);
    }
    /**
     * Extract the epoch time stamp and convert back to a date
     * @param val This will be the epoch, but as a string
     * @returns
     */
    static decode(val) {
        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a date column and got an invalid date value: ${val}`);
        }
        let epoch = parseInt(val);
        if ((0, lodash_1.isFinite)(epoch)) {
            return new Date(epoch);
        }
        return null;
    }
}
exports.DateType = DateType;
DateType.isNumeric = true;
DateType.typeName = "date";
//# sourceMappingURL=DateType.js.map