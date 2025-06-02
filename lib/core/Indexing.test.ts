import Logger from "../../lib/utils/Logger";
import Chance from "chance";
import {random, map} from "lodash";
import Indexing from "../../lib/core/Indexing";
import {type Query} from "../../lib/types";
import {AwsEngine} from "../../lib/core/AwsEngine";
import {type S3Options} from "../../lib/services/S3Helper";
import {ModelMetaStore, type ColumnSchema} from "../../lib/decorators/ModelMetaStore";
import { Column, Storm, Entity, Model } from "../../lib";


@Entity({expires: 100})
class TestModel extends Model {

    //@PrimaryGeneratedColumn()
    //id: number;

    @Column({unique: true})
    aUniqueString: string;

    @Column({index: true})
    aString: string;

    @Column({index: true})
    aDate: Date;

    @Column({index: true})
    aDate2: Date;

    @Column({index: true})
    aNumber: number;

    @Column({type: 'integer', index: true})
    aInteger: number;

    @Column({type: 'float', index: true})
    aFloat: number;

    @Column({type: 'boolean', index: true})
    aBoolean: number;

    @Column({type: 'array'})
    aArray: string[];

    @Column({type: 'json'})
    aJSONObject: number;

    @Column({type: 'json'})
    aObject: number;

}

describe('Indexing', () => {
    beforeEach(() => {
        // Clear all mock storage
        mockStorage.clear();
        mockSets.clear();
        mockZSets.clear();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Clean up
        return;
    });

    test('max id', async () => {
        const testId = random(10000,999999999);
        await indx.setMaxId(testId);

        let id = await indx.getMaxId();
        expect(id).toEqual(testId);
        return;
    });

    test('unique', async () => {
        const vals = ['elephant', 'fish', 'wolf', 'dog'];
        const fieldName = 'uniqueAnimal';

        await indx.clearUniques(fieldName);
        let setList = await indx.getUniques(fieldName);
        expect(setList.length).toEqual(0);
        
        for (const val of vals) {
            await indx.addUnique(fieldName, val);
        }

        setList = await indx.getUniques(fieldName);
        expect(setList.length).toEqual(vals.length);

        expect(await indx.isMemberUniques(fieldName, 'fish')).toEqual(true);
        expect(await indx.isMemberUniques(fieldName, 'tiger')).toEqual(false);

        return;
    });        

    test('numeric', async () => {
        const vals = [1, 5, 7, 2, 200, -46, 23634634563463, -23463463456];
        const fieldName = 'age';

        await indx.clearNumerics(fieldName);
        let setList = await indx.getNumerics(fieldName);
        expect(setList.length).toEqual(0);
        
        for (const val of vals) {
            await indx.addNumeric(fieldName, val);
        }

        setList = await indx.getNumerics(fieldName);
        expect(setList.length).toEqual(vals.length);

        const sortedVals = [...vals].sort((a, b) => a - b);
        const scores = map(setList, 'score');

        for (let i = 0; i < scores.length; i++) {
            expect(scores[i]).toEqual(sortedVals[i]);
        }

        return;
    });

    test('string', async () => {
        const vals = ['elephant', 'fish', 'wolf', 'dog'];
        const fieldName = 'animal';

        await indx.clear(fieldName);
        let setList = await indx.list(fieldName);
        expect(setList.length).toEqual(0);
        
        for (const val of vals) {
            await indx.add(fieldName, val);
        }

        setList = await indx.list(fieldName);
        expect(setList.length).toEqual(vals.length);
        const resVals = map(setList, 'val');

        const sortedVals = [...vals].sort();
        Logger.debug(sortedVals);
        Logger.debug(resVals);

        expect(new Set(resVals)).toEqual(new Set(sortedVals));

        return;
    });

    test('search string index', async () => {
        const fieldName = 'animal';
        const values = ['elephant', 'elephant baby', 'baby elephant', 'tiger', 'lion'];
        
        await indx.clear(fieldName);
        
        // Add test values
        for (const val of values) {
            await indx.add(fieldName, val);
        }

        // Test exact match
        let results = await indx.search(fieldName, 'tiger');
        expect(results).toHaveLength(1);
        expect(results).toContain(555); // The test ID from constructor

        // Test case-insensitive partial match
        results = await indx.search(fieldName, 'ELEPHANT');
        expect(results).toHaveLength(3);
        
        // Test empty search
        results = await indx.search(fieldName, '');
        expect(results).toBeUndefined();

        // Test non-string search
        results = await indx.search(fieldName, 123);
        expect(results).toBeUndefined();
    });

    test('numeric index operations', async () => {
        const fieldName = 'age';
        const values = [25, 30, 35, 40];
        
        await indx.clearNumerics(fieldName);
        
        // Add numeric values
        for (const val of values) {
            await indx.addNumeric(fieldName, val);
        }

        // Test invalid numeric value
        await expect(indx.addNumeric(fieldName, 'not-a-number' as any))
            .rejects
            .toThrow('Invalid numeric value for field age: not-a-number');

        // Test range search
        let results = await indx.searchNumeric(fieldName, {
            $gte: 30,
            $lt: 40
        });
        expect(results).toHaveLength(2);
        expect(results).toContain('555'); // ID is converted to string in zSetAdd

        // Remove a numeric value
        await indx.removeNumeric(fieldName, 35);
        results = await indx.searchNumeric(fieldName, {
            $gte: 30,
            $lt: 40
        });
        expect(results).toHaveLength(1);

        // Test invalid remove
        await expect(indx.removeNumeric(fieldName, NaN))
            .rejects
            .toThrow('Invalid numeric value for field age: NaN');
    });

    test('remove and set index for field', async () => {
        const fieldName = 'animal';
        const value = 'giraffe';
        const oldValue = null;
        
        // Test setting new index
        await indx.setIndexForField(fieldName, value, oldValue);
        let members = await indx.list(fieldName);
        expect(members).toHaveLength(1);
        expect(members[0].val).toBe(value);
        expect(members[0].id).toBe(555);

        // Test removing index
        await indx.removeIndexForField(fieldName, value);
        members = await indx.list(fieldName);
        expect(members).toHaveLength(0);

        // Test null values
        await indx.setIndexForField(fieldName, null, oldValue);
        members = await indx.list(fieldName);
        expect(members).toHaveLength(0);

        await indx.removeIndexForField(fieldName, null);
        members = await indx.list(fieldName);
        expect(members).toHaveLength(0);
    });

    test('error handling for non-indexed fields', async () => {
        const nonIndexedField = 'nonexistent';
        
        // Test adding index to non-existent field
        await expect(indx.add(nonIndexedField, 'test'))
            .rejects
            .toThrow('The schema does not have a field called nonexistent!');

        // Test searching non-existent field
        await expect(indx.search(nonIndexedField, 'test'))
            .rejects
            .toThrow('The schema does not have a field called nonexistent!');

        // Test numeric operations on non-existent field
        await expect(indx.addNumeric(nonIndexedField, 123))
            .rejects
            .toThrow('The schema does not have a field called nonexistent!');
    });
});