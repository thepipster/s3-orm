"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IntegerType_1 = require("./IntegerType");
describe('IntegerType', () => {
    test('name', () => {
        expect(IntegerType_1.IntegerType.typeName).toEqual('integer');
    });
    test('isNumeric', () => {
        expect(IntegerType_1.IntegerType.isNumeric).toEqual(true);
    });
    test('encode', () => {
        const testStr = IntegerType_1.IntegerType.mock();
        const encoded = IntegerType_1.IntegerType.encode(testStr);
        expect(typeof encoded).toEqual(`string`);
        expect(encoded).toEqual(testStr + '');
        return;
    });
    test('decode', () => {
        const encoded = IntegerType_1.IntegerType.encode('6');
        const parsed = IntegerType_1.IntegerType.decode(encoded);
        expect(parsed).toEqual(6);
        return;
    });
});
//# sourceMappingURL=IntegerType.test.js.map