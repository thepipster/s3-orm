
"use strict";

const IdType = require('./IdType.js');
const encodeMarker = IdType.encodedMarker;

describe('IdType', () => {

    test('encode', async () => {

        let test = IdType.encode(5);
        
        expect(test).toEqual(`${encodeMarker}5`);

        return;
    })
 
    test('double encode', async () => {

        let encoded = `${encodeMarker}5`;
        let test = IdType.encode(encoded);
        
        expect(test).toEqual(`${encodeMarker}5`);

        return;
    })

    test('parse', async () => {

        let encoded = `${encodeMarker}5`;
        let parsed = IdType.parse(encoded);
        
        expect(parsed).toEqual(5);

        return;
    })
});