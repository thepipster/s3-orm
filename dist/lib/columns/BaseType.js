"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseType = void 0;
/**
 * A base class for a column type. We have to deal with 2 scenarios:
 * 2. encode() - We saving a valie to the database, so we need to encoded it into an internal value
 * 3. decode() - we are loading a value from the database, so we need to decode it back into a value
 */
class BaseType {
    static mock() {
        return null;
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
exports.BaseType = BaseType;
BaseType.isNumeric = false;
BaseType.typeName = "base";
//# sourceMappingURL=BaseType.js.map