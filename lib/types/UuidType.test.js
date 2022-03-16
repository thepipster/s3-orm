
"use strict";

import Logger from "../utils/Logger.js";
import UuidType from './UuidType.js';
const encodeMarker = UuidType.encodedMarker;
const testUuid = 'c06032b7-e3b7-4278-9fe6-a83b153d1804';

describe('UuidType', () => {

    test('name', () => {
        expect(UuidType.name).toEqual('uuid');
    })

    test('isNumeric', () => {
        expect(UuidType.isNumeric).toEqual(false);
    })

    test('encode', () => {

        
        const encoded = UuidType.encode(testUuid);
        
        expect(encoded.slice(0, encodeMarker.length)).toEqual(`${encodeMarker}`);
        expect(typeof encoded).toEqual(`string`);
        //expect(encoded).toEqual(testStr); `${encodeMarker}5`

        return;
    })

    test('parse', () => {

        const encoded = UuidType.encode(testUuid);
        const parsed = UuidType.parse(encoded);
        
        expect(parsed).toEqual(testUuid);


        return;
    })
});