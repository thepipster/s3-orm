"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FloatType_1 = require("./FloatType");
describe('FloatType', () => {
    test('name', () => {
        expect(FloatType_1.FloatType.typeName).toEqual('float');
    });
    test('isNumeric', () => {
        expect(FloatType_1.FloatType.isNumeric).toEqual(true);
    });
    test('encode', () => {
        const testStr = FloatType_1.FloatType.mock();
        const encoded = FloatType_1.FloatType.encode(testStr);
        expect(typeof encoded).toEqual(`string`);
        // Don't check for specific first character as it depends on the random value
        //expect(encoded).toEqual(testStr); `${encodeMarker}5`
        return;
    });
    test('parse', () => {
        const encoded = FloatType_1.FloatType.encode('6.474');
        const parsed = parseFloat(encoded);
        expect(parsed).toEqual(6.474);
        return;
    });
});
//# sourceMappingURL=FloatType.test.js.map