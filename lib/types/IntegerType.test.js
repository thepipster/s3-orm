
"use strict";

const Logger = require('../utils/Logger.js');
const IntegerType = require('./IntegerType.js');
const encodeMarker = IntegerType.encodedMarker;

describe('IntegerType', () => {

    test('name', () => {
        expect(IntegerType.name).toEqual('integer');
    })

    test('isNumeric', () => {
        expect(IntegerType.isNumeric).toEqual(true);
    })

    test('encode', () => {

        const testStr = IntegerType.mock();
        const encoded = IntegerType.encode(testStr);
        
        expect(encoded.slice(0, encodeMarker.length)).toEqual(`${encodeMarker}`);
        expect(typeof encoded).toEqual(`string`);
        //expect(encoded).toEqual(testStr); `${encodeMarker}5`

        return;
    })

    test('parse', () => {

        const encoded = IntegerType.encode('6');
        const parsed = IntegerType.parse(encoded);
        
        expect(parsed).toEqual(6);


        return;
    })
});