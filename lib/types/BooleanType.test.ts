
"use strict";

import Logger from "../utils/Logger.js";
import BooleanType from './BooleanType';
const encodeMarker = BooleanType.encodedMarker;

describe('BooleanType', () => {

    test('name', () => {
        expect(BooleanType.name).toEqual('boolean');
    })

    test('isNumeric', () => {
        expect(BooleanType.isNumeric).toEqual(false);
    })

    test('encode', () => {

        expect(BooleanType.encode(true)).toEqual(`${encodeMarker}1`);
        expect(BooleanType.encode(1)).toEqual(`${encodeMarker}1`);
        expect(BooleanType.encode('true')).toEqual(`${encodeMarker}1`);

        expect(BooleanType.encode(false)).toEqual(`${encodeMarker}0`);
        expect(BooleanType.encode(0)).toEqual(`${encodeMarker}0`);
        expect(BooleanType.encode('false')).toEqual(`${encodeMarker}0`);
        expect(BooleanType.encode(null)).toEqual(`${encodeMarker}0`);
        expect(BooleanType.encode(undefined)).toEqual(`${encodeMarker}0`);
        
        
        return;
    })

    test('parse', () => {

        expect(BooleanType.parse(BooleanType.encode(true))).toEqual(true);



        return;
    })
});