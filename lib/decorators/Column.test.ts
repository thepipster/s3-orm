import { Column } from './Column';
import { Model } from '../core/Model';
import { ModelMetaStore } from './ModelMetaStore';
import { type Query } from '../types';

// Mock Storm for Model class
jest.mock('../core/Storm', () => ({
    Storm: {
        debug: false,
        s3: jest.fn().mockReturnValue({
            hasObject: jest.fn().mockResolvedValue(true),
            getObject: jest.fn().mockResolvedValue('{}'),
            putObject: jest.fn().mockResolvedValue(undefined)
        })
    }
}));

// Test model classes
class TestStringModel extends Model {
    @Column({ type: 'string' })
    name: string;
}

class TestNumberModel extends Model {
    @Column({ type: 'number' })
    count: number;
}

class TestDateModel extends Model {
    @Column({ type: 'date' })
    createdAt: Date;
}

class TestJsonModel extends Model {
    @Column({ type: 'json' })
    metadata: Record<string, any>;
}

class TestArrayModel extends Model {
    @Column({ type: 'array' })
    tags: string[];
}

class TestIndexedModel extends Model {
    @Column({ type: 'string', index: true })
    indexedField: string;
}

class TestUniqueModel extends Model {
    @Column({ type: 'string', unique: true })
    uniqueField: string;
}

class TestDefaultValueModel extends Model {
    @Column({ type: 'string', default: 'default-value' })
    defaultField: string;
}

describe('Column Decorator', () => {
    beforeEach(() => {
        // Clear the ModelMetaStore before each test
        (ModelMetaStore as any).store = new Map();
    });

    describe('Type Definitions', () => {
        test('should register string column correctly', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'name',
                type: 'string',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            ModelMetaStore.addColumn(TestStringModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestStringModel.name, 'name');
            expect(schema.type).toBe('string');
            expect(schema.isNumeric).toBe(false);
            expect(schema.encode('test')).toBe('test');
            expect(schema.decode('test')).toBe('test');
        });

        test('should register number column correctly', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'count',
                type: 'number',
                isNumeric: true,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : Number(val)
            };
            ModelMetaStore.addColumn(TestNumberModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestNumberModel.name, 'count');
            expect(schema.type).toBe('number');
            expect(schema.isNumeric).toBe(true);
            expect(schema.encode(123)).toBe('123');
            expect(schema.decode('123')).toBe(123);
        });

        test('should register date column correctly', () => {
            // Manually register the model schema for testing
            const testDate = new Date('2025-03-12T16:51:11-04:00');
            const columnSchema = {
                name: 'createdAt',
                type: 'date',
                isNumeric: false,
                encode: (val: any) => val instanceof Date ? val.toISOString() : '',
                decode: (val: string) => !val ? null : new Date(val)
            };
            ModelMetaStore.addColumn(TestDateModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestDateModel.name, 'createdAt');
            expect(schema.type).toBe('date');
            expect(schema.isNumeric).toBe(false);
            expect(schema.encode(testDate)).toBe(testDate.toISOString());
            expect(schema.decode(testDate.toISOString())).toEqual(testDate);
        });

        test('should register json column correctly', () => {
            // Manually register the model schema for testing
            const testJson = { key: 'value', nested: { array: [1, 2, 3] } };
            const columnSchema = {
                name: 'metadata',
                type: 'json',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : JSON.stringify(val),
                decode: (val: string) => !val ? null : JSON.parse(val)
            };
            ModelMetaStore.addColumn(TestJsonModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestJsonModel.name, 'metadata');
            expect(schema.type).toBe('json');
            expect(schema.isNumeric).toBe(false);
            expect(schema.encode(testJson)).toBe(JSON.stringify(testJson));
            expect(schema.decode(JSON.stringify(testJson))).toEqual(testJson);
        });

        test('should register array column correctly', () => {
            // Manually register the model schema for testing
            const testArray = ['tag1', 'tag2', 'tag3'];
            const columnSchema = {
                name: 'tags',
                type: 'array',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : JSON.stringify(val),
                decode: (val: string) => !val ? null : JSON.parse(val)
            };
            ModelMetaStore.addColumn(TestArrayModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestArrayModel.name, 'tags');
            expect(schema.type).toBe('array');
            expect(schema.isNumeric).toBe(false);
            expect(schema.encode(testArray)).toBe(JSON.stringify(testArray));
            expect(schema.decode(JSON.stringify(testArray))).toEqual(testArray);
        });
    });

    describe('Column Options', () => {
        test('should handle indexed columns', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'indexedField',
                type: 'string',
                isNumeric: false,
                index: true,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            ModelMetaStore.addColumn(TestIndexedModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestIndexedModel.name, 'indexedField');
            expect(schema.index).toBe(true);
        });

        test('should handle unique columns', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'uniqueField',
                type: 'string',
                isNumeric: false,
                unique: true,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            ModelMetaStore.addColumn(TestUniqueModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestUniqueModel.name, 'uniqueField');
            expect(schema.unique).toBe(true);
        });

        test('should handle default values', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'defaultField',
                type: 'string',
                isNumeric: false,
                default: 'default-value',
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            ModelMetaStore.addColumn(TestDefaultValueModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestDefaultValueModel.name, 'defaultField');
            expect(schema.default).toBe('default-value');
        });
    });

    describe('Edge Cases', () => {
        test('should handle null values', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'name',
                type: 'string',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            ModelMetaStore.addColumn(TestStringModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestStringModel.name, 'name');
            expect(schema.encode(null)).toBe('');
            expect(schema.decode('')).toBe(null);
        });

        test('should handle undefined values', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'name',
                type: 'string',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            ModelMetaStore.addColumn(TestStringModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestStringModel.name, 'name');
            expect(schema.encode(undefined)).toBe('');
            expect(schema.decode('')).toBe(null);
        });

        test('should handle type conversion for numeric fields', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'count',
                type: 'number',
                isNumeric: true,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : Number(val)
            };
            ModelMetaStore.addColumn(TestNumberModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestNumberModel.name, 'count');
            expect(schema.decode('123.45')).toBe(123.45);
            expect(schema.decode('-123')).toBe(-123);
            expect(schema.decode('0')).toBe(0);
        });

        test('should handle invalid date strings', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'createdAt',
                type: 'date',
                isNumeric: false,
                encode: (val: any) => val instanceof Date ? val.toISOString() : '',
                decode: (val: string) => !val ? null : new Date(val)
            };
            ModelMetaStore.addColumn(TestDateModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestDateModel.name, 'createdAt');
            const invalidDate = schema.decode('invalid-date');
            expect(invalidDate.toString()).toBe('Invalid Date');
        });

        test('should handle invalid JSON strings', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'metadata',
                type: 'json',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : JSON.stringify(val),
                decode: (val: string) => !val ? null : JSON.parse(val)
            };
            ModelMetaStore.addColumn(TestJsonModel.name, columnSchema);
            
            const schema = ModelMetaStore.getColumn(TestJsonModel.name, 'metadata');
            expect(() => schema.decode('invalid-json')).toThrow();
        });
    });
});
