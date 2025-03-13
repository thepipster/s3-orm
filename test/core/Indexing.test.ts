import Logger from "../../lib/utils/Logger";
import Chance from "chance";
import {random, map} from "lodash";
import Indexing from "../../lib/core/Indexing";
import {type Query} from "../../lib/types";
import {Storm} from "../../lib/core/Storm";
import {AwsEngine} from "../../lib/core/AwsEngine";
import {type S3Options} from "../../lib/services/S3Helper";
import {ModelMetaStore, type ColumnSchema} from "../../lib/decorators/ModelMetaStore";

// Mock storage for S3Helper
const mockStorage = new Map<string, { key: string; value: string; id?: number }>();
const mockSets = new Map<string, Set<string>>();
const mockZSets = new Map<string, Map<string, number>>();

// Helper functions for mock implementation
const extractIdFromKey = (key: string): number | undefined => {
    const parts = key.split('###');
    return parts.length > 1 ? parseInt(parts[1]) : undefined;
};

const extractValueFromKey = (key: string): string => {
    const parts = key.split('###')[0].split('/');
    return parts[parts.length - 1];
};

// Mock S3Helper
jest.mock('../../lib/services/S3Helper', () => {
    return {
        S3Helper: jest.fn().mockImplementation(() => ({
            uploadString: jest.fn().mockImplementation((val, key) => {
                const id = extractIdFromKey(key);
                mockStorage.set(key, { key, value: val, id });
                return Promise.resolve();
            }),
            get: jest.fn().mockImplementation((key) => {
                const item = mockStorage.get(key);
                return Promise.resolve(item?.value);
            }),
            delete: jest.fn().mockImplementation((key) => {
                mockStorage.delete(key);
                return Promise.resolve();
            }),
            exists: jest.fn().mockImplementation((key) => {
                return Promise.resolve(mockStorage.has(key));
            }),
            list: jest.fn().mockImplementation((prefix) => {
                const keys = Array.from(mockStorage.entries())
                    .filter(([key]) => key.startsWith(prefix))
                    .map(([key, item]) => ({ Key: key, ...item }));
                return Promise.resolve(keys);
            }),
            deleteAll: jest.fn().mockImplementation((keys) => {
                keys.forEach(({Key}) => mockStorage.delete(Key));
                return Promise.resolve();
            }),
            // Mock S3 set operations
            setAdd: jest.fn().mockImplementation((setName, val) => {
                if (!mockSets.has(setName)) {
                    mockSets.set(setName, new Set());
                }
                mockSets.get(setName).add(val);
                return Promise.resolve();
            }),
            setRemove: jest.fn().mockImplementation((setName, val) => {
                if (mockSets.has(setName)) {
                    mockSets.get(setName).delete(val);
                }
                return Promise.resolve();
            }),
            setIsMember: jest.fn().mockImplementation((setName, val) => {
                return Promise.resolve(mockSets.has(setName) && mockSets.get(setName).has(val));
            }),
            setMembers: jest.fn().mockImplementation((setName) => {
                return Promise.resolve(Array.from(mockSets.get(setName) || []));
            }),
            setClear: jest.fn().mockImplementation((setName) => {
                mockSets.delete(setName);
                return Promise.resolve();
            }),
            // Mock S3 sorted set operations
            zSetAdd: jest.fn().mockImplementation((setName, score, val) => {
                if (!mockZSets.has(setName)) {
                    mockZSets.set(setName, new Map());
                }
                mockZSets.get(setName).set(val, Number(score));
                return Promise.resolve();
            }),
            zSetRemove: jest.fn().mockImplementation((setName, score, val) => {
                if (mockZSets.has(setName)) {
                    mockZSets.get(setName).delete(val);
                }
                return Promise.resolve();
            }),
            zSetMembers: jest.fn().mockImplementation((setName, withScores = false) => {
                if (!mockZSets.has(setName)) return Promise.resolve([]);
                const members = Array.from(mockZSets.get(setName).entries())
                    .sort(([, a], [, b]) => a - b)
                    .map(([val, score]) => withScores ? { val, score } : val);
                return Promise.resolve(members);
            }),
            zSetClear: jest.fn().mockImplementation((setName) => {
                mockZSets.delete(setName);
                return Promise.resolve();
            }),
            zRange: jest.fn().mockImplementation((setName, query) => {
                if (!mockZSets.has(setName)) return Promise.resolve([]);
                
                const entries = Array.from(mockZSets.get(setName).entries())
                    .filter(([, score]) => {
                        if (query.$gt !== undefined && score <= query.$gt) return false;
                        if (query.$gte !== undefined && score < query.$gte) return false;
                        if (query.$lt !== undefined && score >= query.$lt) return false;
                        if (query.$lte !== undefined && score > query.$lte) return false;
                        return true;
                    })
                    .sort(([, a], [, b]) => query.order === 'DESC' ? b - a : a - b);

                if (query.limit) {
                    return Promise.resolve(entries.slice(0, query.limit).map(([val, score]) => ({ val, score })));
                }
                return Promise.resolve(entries.map(([val, score]) => ({ val, score })));
            })
        }))
    };
});

const s3Options: S3Options = {
    bucket: 'test-bucket',
    prefix: 'test-prefix/',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret'
};

const s3 = new AwsEngine(s3Options);
Storm.connect(s3Options);

const chance = new Chance();
const modelName = 'testing-index-model';

// Add model schema columns
const ageSchema: ColumnSchema = {
    name: 'age',
    type: 'integer',
    index: true,
    isNumeric: true,
    toString: (val: any) => val.toString(),
    fromString: (val: string) => parseInt(val)
};

const animalSchema: ColumnSchema = {
    name: 'animal',
    type: 'string',
    index: true,
    isNumeric: false,
    toString: (val: any) => val.toString(),
    fromString: (val: string) => val
};

const uniqueAnimalSchema: ColumnSchema = {
    name: 'uniqueAnimal',
    type: 'string',
    unique: true,
    isNumeric: false,
    toString: (val: any) => val.toString(),
    fromString: (val: string) => val
};

const lastLoginSchema: ColumnSchema = {
    name: 'lastLogin',
    type: 'date',
    index: true,
    isNumeric: false,
    toString: (val: any) => val.toString(),
    fromString: (val: string) => new Date(val)
};

const preferencesSchema: ColumnSchema = {
    name: 'preferences',
    type: 'json',
    index: true,
    isNumeric: false,
    toString: (val: any) => JSON.stringify(val),
    fromString: (val: string) => JSON.parse(val)
};

const tagsSchema: ColumnSchema = {
    name: 'tags',
    type: 'array',
    index: true,
    isNumeric: false,
    toString: (val: any) => JSON.stringify(val),
    fromString: (val: string) => JSON.parse(val)
};

ModelMetaStore.addColumn(modelName, ageSchema);
ModelMetaStore.addColumn(modelName, animalSchema);
ModelMetaStore.addColumn(modelName, uniqueAnimalSchema);
ModelMetaStore.addColumn(modelName, lastLoginSchema);
ModelMetaStore.addColumn(modelName, preferencesSchema);
ModelMetaStore.addColumn(modelName, tagsSchema);

const indx = new Indexing(555, modelName);

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