
import {IntegerType} from './IntegerType';

describe('IntegerType', () => {

    test('name', () => {
        expect(IntegerType.typeName).toEqual('integer');
    })

    test('isNumeric', () => {
        expect(IntegerType.isNumeric).toEqual(true);
    })

    test('encode', () => {

        const testStr = IntegerType.mock();
        const encoded = IntegerType.encode(testStr);
        
        expect(typeof encoded).toEqual(`string`);
        expect(encoded).toEqual(testStr+'');

        return;
    })

    test('decode', () => {

        const encoded = IntegerType.encode('6');
        const parsed = IntegerType.decode(encoded);
        
        expect(parsed).toEqual(6);


        return;
    })
});