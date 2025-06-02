
import {UuidType} from './UuidType';
const testUuid = 'c06032b7-e3b7-4278-9fe6-a83b153d1804';

describe('UuidType', () => {

    test('name', () => {
        expect(UuidType.typeName).toEqual('uuid');
    })

    test('isNumeric', () => {
        expect(UuidType.isNumeric).toEqual(false);
    })

    test('encode', () => {

        
        const encoded = UuidType.encode(testUuid);
        
        expect(typeof encoded).toEqual(`string`);
        expect(encoded).toEqual(testUuid);

        return;
    })

    test('decode', () => {

        const encoded = UuidType.encode(testUuid);
        const parsed = UuidType.decode(encoded);
        
        expect(parsed).toEqual(testUuid);


        return;
    })
});