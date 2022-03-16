
"use strict";

import Logger from "../utils/Logger.js";
import ArrayType from './ArrayType.js';
const encodeMarker = ArrayType.encodedMarker;

const testObj = ['tag1', 'tag2', 'tsg346',  'sdgsdgsdgds'];

describe('ArrayType', () => {

    test('name', () => {
        expect(ArrayType.name).toEqual('array');
    })

    test('isNumeric', () => {
        expect(ArrayType.isNumeric).toEqual(false);
    })
        
    test('encode', async () => {

        let test = ArrayType.encode(testObj);
        
        expect(test.slice(0, encodeMarker.length)).toEqual(`${encodeMarker}`);
        expect(typeof test).toEqual(`string`);
        expect(test.includes(testObj[0])).toEqual(true);

        return;
    })

    test('parse', async () => {

        let encoded = ArrayType.encode(testObj);
        let parsed = ArrayType.parse(encoded);
        
        expect(parsed.length).toEqual(testObj.length);
        expect(parsed[0]).toEqual(testObj[0]);
        expect(parsed[1]).toEqual(testObj[1]);
        expect(parsed[2]).toEqual(testObj[2]);
        expect(parsed[3]).toEqual(testObj[3]);

        return;
    })
});