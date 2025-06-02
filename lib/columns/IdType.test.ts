import {IdType} from './IdType';

describe('IdType', () => {

    test('name', () => {
        expect(IdType.typeName).toEqual('id');
    })

    test('isNumeric', () => {
        expect(IdType.isNumeric).toEqual(true);
    })

    test('encode', async () => {

        let test = IdType.encode(5);
        
        expect(test).toEqual(`5`);

        return;
    })
 
    test('double encode', async () => {

        let encoded = `5`;
        let test = IdType.encode(encoded);
        
        expect(test).toEqual(`5`);

        return;
    })

    test('parse', async () => {

        let encoded = `5`;
        let parsed = IdType.decode(encoded);
        
        expect(parsed).toEqual(5);

        return;
    })
});