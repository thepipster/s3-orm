import { NumericIndex } from '../../lib/indexing/NumericIndex';
import { Column, Stash, Entity, Model } from "../../lib";
import {ModelMetaStore} from "../../lib/decorators/ModelMetaStore";
import Logger from '../../lib/utils/Logger';

Stash.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.AWS_TEST_ROOT_FOLDER,
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
});

@Entity({expires: 100})
class TestIndexModel extends Model {
    @Column({index: true})
    aNumber: number;
    @Column({unique: true})
    aUniqueNumber: number;
    @Column({type: 'float', index: true})
    aFloat: number;    
}

jest.setTimeout(5000);

const orderedSet: NumericIndex = new NumericIndex('TestIndexModel');


describe('NumericIndex', () => {
    
    describe('add()', () => {
        it('should add a single value correctly', async () => {
            
            await orderedSet.add(1, 'aNumber', 100, null);
            const defn = ModelMetaStore.getColumn('TestIndexModel', 'aNumber');
            
            let key = `${orderedSet._getPrefix('aNumber', 100, defn)}###1`;
            const result = await Stash.aws().get(key);
            expect(result).toHaveLength(1);
            //expect(result[0].value).toBe(100);
        });


        it.only('should maintain order with multiple values', async () => {
            
            const values = [100, 50, 75, 25, 150];

            for (let i=0; i<values.length; i+=1){ 
                await orderedSet.add(i+1, 'aNumber', values[i]);
            }

            const result = await orderedSet.getIds('aNumber', {$gte: 25});
            Logger.debug(result)
            expect(result[0]).toEqual(4);
            expect(result[1]).toEqual(2);
            expect(result[2]).toEqual(3);
            expect(result[3]).toEqual(1);
            expect(result[4]).toEqual(5);
        });

        /*
        it('should handle duplicate values', async () => {
            await orderedSet.add('score', 100);
            await orderedSet.add('score', 100);
            const result = await orderedSet.query({});
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(100);
        });
        */
        
    });

    /*
    describe('remove()', () => {
        it('should remove a value correctly', async () => {
            await orderedSet.add('score', 100);
            await orderedSet.remove('score', 100);
            const result = await orderedSet.query({});
            expect(result).toHaveLength(0);
        });

        it('should maintain balance after removing nodes', async () => {
            const values = [100, 50, 150, 25, 75, 125, 175];
            for (const value of values) {
                await orderedSet.add('score', value);
            }

            await orderedSet.remove('score', 100);
            await orderedSet.remove('score', 50);

            const result = await orderedSet.query({});
            expect(result.map(r => r.value).sort((a, b) => a - b))
                .toEqual([25, 75, 125, 150, 175]);
        });

        it('should handle removing non-existent values', async () => {
            await orderedSet.add('score', 100);
            await orderedSet.remove('score', 200);
            const result = await orderedSet.query({});
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(100);
        });
    });

    describe('query()', () => {
        beforeEach(async () => {
            // Add a range of values for testing queries
            const values = [25, 50, 75, 100, 125, 150, 175];
            for (const value of values) {
                await orderedSet.add('score', value);
            }
        });

        it('should handle $gt query', async () => {
            const result = await orderedSet.query({ $gt: 100 });
            expect(result.map(r => r.value)).toEqual([125, 150, 175]);
        });

        it('should handle $gte query', async () => {
            const result = await orderedSet.query({ $gte: 100 });
            expect(result.map(r => r.value)).toEqual([100, 125, 150, 175]);
        });

        it('should handle $lt query', async () => {
            const result = await orderedSet.query({ $lt: 100 });
            expect(result.map(r => r.value)).toEqual([25, 50, 75]);
        });

        it('should handle $lte query', async () => {
            const result = await orderedSet.query({ $lte: 100 });
            expect(result.map(r => r.value)).toEqual([25, 50, 75, 100]);
        });

        it('should handle range query', async () => {
            const result = await orderedSet.query({ $gte: 50, $lt: 150 });
            expect(result.map(r => r.value)).toEqual([50, 75, 100, 125]);
        });

        it('should return empty array for non-matching range', async () => {
            const result = await orderedSet.query({ $gt: 200 });
            expect(result).toHaveLength(0);
        });
    });

    describe('AVL Tree Properties', () => {
        it('should maintain balance after multiple operations', async () => {
            // Add values in a way that would cause imbalance in a non-AVL tree
            const values = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
            for (const value of values) {
                await orderedSet.add('score', value);
            }

            // Verify all values are present and in order
            const result = await orderedSet.query({});
            expect(result.map(r => r.value)).toEqual(values);

            // Remove some values and verify remaining order
            await orderedSet.remove('score', 50);
            await orderedSet.remove('score', 30);
            
            const afterRemoval = await orderedSet.query({});
            const expectedValues = values.filter(v => v !== 50 && v !== 30).sort((a, b) => a - b);
            expect(afterRemoval.map(r => r.value)).toEqual(expectedValues);
        });
    });
    */
});
