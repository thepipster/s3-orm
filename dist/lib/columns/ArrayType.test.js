"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ArrayType_1 = require("../../lib/columns/ArrayType");
const lodash_1 = __importDefault(require("lodash"));
const testObj = ['tag1', 'tag2', 'tsg346', 'sdgsdgsdgds'];
const testStr = `["tag1","tag2","tsg346","sdgsdgsdgds"]`;
describe('ArrayType', () => {
    test('name', () => {
        expect(ArrayType_1.ArrayType.typeName).toEqual('array');
    });
    test('isNumeric', () => {
        expect(ArrayType_1.ArrayType.isNumeric).toEqual(false);
    });
    test('encode', () => {
        const test = ArrayType_1.ArrayType.encode(testObj);
        expect(typeof test).toEqual(`string`);
        expect(test).toEqual(testStr);
    });
    test('decode', () => {
        const encoded = ArrayType_1.ArrayType.encode(testObj);
        const decoded = ArrayType_1.ArrayType.decode(encoded);
        //expect(typeof test).toEqual(`array`);
        expect(lodash_1.default.isArray(decoded)).toEqual(true);
        expect(testObj).toEqual(decoded);
    });
});
//# sourceMappingURL=ArrayType.test.js.map