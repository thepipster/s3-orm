
"use strict";

const Logger = require('../utils/Logger.js');
const DateType = require('./DateType.js');
const encodeMarker = DateType.encodedMarker;

describe('DateType', () => {

    test('name', () => {
        expect(DateType.name).toEqual('date');
    })

    test('isNumeric', () => {
        expect(DateType.isNumeric).toEqual(true);
    })

    test('encode', () => {

        const epochDate = new Date();

        const encoded = DateType.encode(epochDate);

        expect(encoded).toEqual(`${encodeMarker}${epochDate.getTime()}`);
        
        
        return;
    })

    test('parse', () => {

        const epochDate = new Date();
        const encoded = DateType.encode(epochDate);
        const parsed = DateType.parse(encoded);

        expect(parsed.getTime()).toEqual(epochDate.getTime());
        expect(parsed.getDay()).toEqual(epochDate.getDay());

        return;
    })
});