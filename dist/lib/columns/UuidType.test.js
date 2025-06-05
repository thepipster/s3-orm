"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UuidType_1 = require("./UuidType");
const testUuid = 'c06032b7-e3b7-4278-9fe6-a83b153d1804';
describe('UuidType', () => {
    test('name', () => {
        expect(UuidType_1.UuidType.typeName).toEqual('uuid');
    });
    test('isNumeric', () => {
        expect(UuidType_1.UuidType.isNumeric).toEqual(false);
    });
    test('encode', () => {
        const encoded = UuidType_1.UuidType.encode(testUuid);
        expect(typeof encoded).toEqual(`string`);
        expect(encoded).toEqual(testUuid);
        return;
    });
    test('decode', () => {
        const encoded = UuidType_1.UuidType.encode(testUuid);
        const parsed = UuidType_1.UuidType.decode(encoded);
        expect(parsed).toEqual(testUuid);
        return;
    });
});
//# sourceMappingURL=UuidType.test.js.map