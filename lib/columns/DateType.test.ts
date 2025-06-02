
import {DateType} from './DateType';

describe('DateType', () => {

    test('name', () => {
        expect(DateType.typeName).toEqual('date');
    })

    test('isNumeric', () => {
        expect(DateType.isNumeric).toEqual(true);
    })

    test('encode', () => {

        const epochDate = new Date();

        const encoded = DateType.encode(epochDate);

        expect(encoded).toEqual(`${epochDate.getTime()}`);
            
        return;
    })

    test('decode', () => {

        const epochDate = new Date();
        const encoded = DateType.encode(epochDate);
        const parsed = DateType.decode(encoded);

        expect(parsed.getTime()).toEqual(epochDate.getTime());
        expect(parsed.getDay()).toEqual(epochDate.getDay());

        return;
    })
});