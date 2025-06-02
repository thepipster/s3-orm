
import {BooleanType} from "../../lib/columns/BooleanType";
import _ from "lodash";

describe('BooleanType', () => {

    test('name', () => {
        expect(BooleanType.typeName).toEqual('boolean');
    })

    test('isNumeric', () => {
        expect(BooleanType.isNumeric).toEqual(false);
    })

    test('encode', () => {        
        
        expect(BooleanType.encode("true")).toEqual("1");
        expect(BooleanType.encode(true)).toEqual("1");
        expect(BooleanType.encode("1")).toEqual("1");

        expect(BooleanType.encode(undefined)).toEqual("0");
        expect(BooleanType.encode(null)).toEqual("0");
        expect(BooleanType.encode("false")).toEqual("0");
        expect(BooleanType.encode(false)).toEqual("0");
        expect(BooleanType.encode("0")).toEqual("0");

    })
    
    test('decode', () => {    
        expect(BooleanType.decode("1")).toEqual(true);
        expect(BooleanType.decode("0")).toEqual(false);
        expect(BooleanType.decode(null)).toEqual(false);
        expect(BooleanType.decode(undefined)).toEqual(false);
    })


});