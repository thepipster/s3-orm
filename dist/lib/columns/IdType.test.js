"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const IdType_1 = require("./IdType");
describe('IdType', () => {
    test('name', () => {
        expect(IdType_1.IdType.typeName).toEqual('id');
    });
    test('isNumeric', () => {
        expect(IdType_1.IdType.isNumeric).toEqual(true);
    });
    test('encode', () => __awaiter(void 0, void 0, void 0, function* () {
        let test = IdType_1.IdType.encode(5);
        expect(test).toEqual(`5`);
        return;
    }));
    test('double encode', () => __awaiter(void 0, void 0, void 0, function* () {
        let encoded = `5`;
        let test = IdType_1.IdType.encode(encoded);
        expect(test).toEqual(`5`);
        return;
    }));
    test('parse', () => __awaiter(void 0, void 0, void 0, function* () {
        let encoded = `5`;
        let parsed = IdType_1.IdType.decode(encoded);
        expect(parsed).toEqual(5);
        return;
    }));
});
//# sourceMappingURL=IdType.test.js.map