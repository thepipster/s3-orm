
"use strict";

const Logger = require('../utils/Logger.js');
const FloatType = require('./FloatType.js');
const encodeMarker = FloatType.encodedMarker;

describe('FloatType', () => {

    test('name', () => {
        expect(FloatType.name).toEqual('float');
    })

    test('isNumeric', () => {
        expect(FloatType.isNumeric).toEqual(true);
    })

    test('encode', () => {

        const testStr = FloatType.mock();
        const encoded = FloatType.encode(testStr);
        
        expect(encoded.slice(0, encodeMarker.length)).toEqual(`${encodeMarker}`);
        expect(typeof encoded).toEqual(`string`);
        //expect(encoded).toEqual(testStr); `${encodeMarker}5`

        return;
    })

    test('parse', () => {

        const encoded = FloatType.encode('6.474');
        const parsed = FloatType.parse(encoded);
        
        expect(parsed).toEqual(6.474);


        return;
    })
});