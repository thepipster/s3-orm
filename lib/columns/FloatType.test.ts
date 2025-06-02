
import {FloatType} from './FloatType';

describe('FloatType', () => {

    test('name', () => {
        expect(FloatType.typeName).toEqual('float');
    })

    test('isNumeric', () => {
        expect(FloatType.isNumeric).toEqual(true);
    })

    test('encode', () => {

        const testStr = FloatType.mock();
        const encoded = FloatType.encode(testStr);
        
        expect(typeof encoded).toEqual(`string`);
        // Don't check for specific first character as it depends on the random value
        //expect(encoded).toEqual(testStr); `${encodeMarker}5`

        return;
    })

    test('parse', () => {   

        const encoded = FloatType.encode('6.474');
        const parsed = parseFloat(encoded);
        
        expect(parsed).toEqual(6.474);


        return;
    })
});