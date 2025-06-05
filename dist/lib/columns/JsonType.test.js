"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const JsonType_1 = require("../../lib/columns/JsonType");
const lodash_1 = __importDefault(require("lodash"));
const testObj = {
    species: 'fish',
    name: 'fred',
    tags: ['tag1', 'tag2']
};
//const testStr = "{\"species\":\"fish\",\"name\":\"fred\",\"tag\":[\"tag1\",\"tag2\"]}";
const testStr = `{"species":"fish","name":"fred","tags":["tag1","tag2"]}`;
/*
const test = {
  aString: "Udunufud ja sursisum haz tolohe ra.",
  aDate: "2624348404805",
  aDate2: "2773023205007",
  aNumber: "7.3991",
  aInteger: "22349432750080",
  aFloat: "5.5",
  aBoolean: "0",
  aArray: '["wu","wuftom","sirbin","lid","bozjet"]',
  "aJSONObject":"{\"stuff\":\"cuf\",\"moreStuff\":\"libib\"}",
  "aObject":"{\"stuff\":\"ohroh\",\"moreStuff\":\"ti\"}"
  id: "4",
  aUniqueString: "sadunu",
};
*/
describe('JsonType', () => {
    test('name', () => {
        expect(JsonType_1.JsonType.typeName).toEqual('json');
    });
    test('isNumeric', () => {
        expect(JsonType_1.JsonType.isNumeric).toEqual(false);
    });
    test('encode', () => {
        const test = JsonType_1.JsonType.encode(testObj);
        expect(typeof test).toEqual(`string`);
        expect(test).toEqual(testStr);
    });
    test('decode', () => {
        const encoded = JsonType_1.JsonType.encode(testObj);
        const decoded = JsonType_1.JsonType.decode(encoded);
        //expect(typeof test).toEqual(`array`);
        expect(lodash_1.default.isObject(decoded)).toEqual(true);
        expect(testObj).toEqual(decoded);
    });
});
//# sourceMappingURL=JsonType.test.js.map