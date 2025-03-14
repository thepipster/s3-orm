
import Logger from "../../lib/utils/Logger";
import {JsonType} from "../../lib/columns/JsonType";
import _ from "lodash";

const testObj = {
    species: 'fish',
    name: 'fred',
    tags: ['tag1', 'tag2']
}
const testStr = `{"species":"fish","name":"fred","tags":["tag1","tag2"]}`;

describe('JsonType', () => {

    test('encode', () => {

        const test:string = JsonType.encode(testObj);
        
        expect(typeof test).toEqual(`string`);
        expect(test).toEqual(testStr);
    })
    

    test('decode', () => {
        
        const encoded:string= JsonType.encode(testObj);
        const decoded = JsonType.decode(encoded);
        
        //expect(typeof test).toEqual(`array`);
        expect(_.isObject(decoded)).toEqual(true);
        expect(testObj).toEqual(decoded);
    })


});