
import Logger from "../../lib/utils/Logger";
import {ArrayType} from "../../lib/columns/ArrayType";
import _ from "lodash";

const testObj = ['tag1', 'tag2', 'tsg346',  'sdgsdgsdgds'];
const testStr = `["tag1","tag2","tsg346","sdgsdgsdgds"]`;
describe('ArrayType', () => {

    test('encode', () => {

        const test:string = ArrayType.encode(testObj);
        
        expect(typeof test).toEqual(`string`);
        expect(test).toEqual(testStr);
    })

    test('decode', () => {
        
        const encoded:string= ArrayType.encode(testObj);
        const decoded = ArrayType.decode(encoded);
        
        //expect(typeof test).toEqual(`array`);
        expect(_.isArray(decoded)).toEqual(true);
        expect(testObj).toEqual(decoded);
    })


});