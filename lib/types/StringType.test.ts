
"use strict";

import Logger from "../utils/Logger.js";
import StringType from './StringType';
const encodeMarker = StringType.encodedMarker;

describe('StringType', () => {

    test('name', () => {
        expect(StringType.name).toEqual('string');
    })

    test('isNumeric', () => {
        expect(StringType.isNumeric).toEqual(false);
    })

    test('encode', () => {

        const testStr = StringType.mock();
        const encoded = StringType.encode(testStr);
        
        expect(encoded.slice(0, encodeMarker.length)).toEqual(`${encodeMarker}`);
        expect(typeof encoded).toEqual(`string`);
        //expect(encoded).toEqual(testStr); `${encodeMarker}5`

        return;
    })

    test('parse', () => {

        const testStr = StringType.mock();
        const encoded = StringType.encode(testStr);
        const parsed = StringType.parse(encoded);
        
        expect(parsed).toEqual(testStr);


        return;
    })
});