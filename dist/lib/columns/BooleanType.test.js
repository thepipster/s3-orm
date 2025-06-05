"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BooleanType_1 = require("../../lib/columns/BooleanType");
describe('BooleanType', () => {
    test('name', () => {
        expect(BooleanType_1.BooleanType.typeName).toEqual('boolean');
    });
    test('isNumeric', () => {
        expect(BooleanType_1.BooleanType.isNumeric).toEqual(false);
    });
    test('encode', () => {
        expect(BooleanType_1.BooleanType.encode("true")).toEqual("1");
        expect(BooleanType_1.BooleanType.encode(true)).toEqual("1");
        expect(BooleanType_1.BooleanType.encode("1")).toEqual("1");
        expect(BooleanType_1.BooleanType.encode(undefined)).toEqual("0");
        expect(BooleanType_1.BooleanType.encode(null)).toEqual("0");
        expect(BooleanType_1.BooleanType.encode("false")).toEqual("0");
        expect(BooleanType_1.BooleanType.encode(false)).toEqual("0");
        expect(BooleanType_1.BooleanType.encode("0")).toEqual("0");
    });
    test('decode', () => {
        expect(BooleanType_1.BooleanType.decode("1")).toEqual(true);
        expect(BooleanType_1.BooleanType.decode("0")).toEqual(false);
        expect(BooleanType_1.BooleanType.decode(null)).toEqual(false);
        expect(BooleanType_1.BooleanType.decode(undefined)).toEqual(false);
    });
});
//# sourceMappingURL=BooleanType.test.js.map