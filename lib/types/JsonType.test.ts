
"use strict";

import Logger from "../utils/Logger.js";
import JsonType from './JsonType';
const encodeMarker = JsonType.encodedMarker;

const testObj = {
    species: 'fish',
    name: 'fred',
    tags: ['tag1', 'tag2']
}

describe('JsonType', () => {

    test('name', () => {
        expect(JsonType.name).toEqual('json');
    })

    test('isNumeric', () => {
        expect(JsonType.isNumeric).toEqual(false);
    })
        
    test('encode', async () => {

        let test = JsonType.encode(testObj);
        
        expect(test.slice(0, encodeMarker.length)).toEqual(`${encodeMarker}`);
        expect(typeof test).toEqual(`string`);
        expect(test.includes('species')).toEqual(true);

        return;
    })

    test('parse', async () => {

        let encoded = JsonType.encode(testObj);
        let parsed = JsonType.parse(encoded);

        expect(parsed.species).toEqual('fish');
        expect(parsed.name).toEqual('fred');
        expect(parsed.tags[0]).toEqual('tag1');
        expect(parsed.tags[1]).toEqual('tag2');

        return;
    })
});