"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DateType_1 = require("./DateType");
describe('DateType', () => {
    test('name', () => {
        expect(DateType_1.DateType.typeName).toEqual('date');
    });
    test('isNumeric', () => {
        expect(DateType_1.DateType.isNumeric).toEqual(true);
    });
    test('encode', () => {
        const epochDate = new Date();
        const encoded = DateType_1.DateType.encode(epochDate);
        expect(encoded).toEqual(`${epochDate.getTime()}`);
        return;
    });
    test('decode', () => {
        const epochDate = new Date();
        const encoded = DateType_1.DateType.encode(epochDate);
        const parsed = DateType_1.DateType.decode(encoded);
        expect(parsed.getTime()).toEqual(epochDate.getTime());
        expect(parsed.getDay()).toEqual(epochDate.getDay());
        return;
    });
});
//# sourceMappingURL=DateType.test.js.map