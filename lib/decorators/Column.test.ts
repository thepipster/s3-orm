import { Column } from '../../lib/decorators/Column';
import { Model } from '../../lib/core/Model';
import { ModelMetaStore } from '../../lib/decorators/ModelMetaStore';
import { type Query } from '../../lib/types';

// Mock Storm for Model class
jest.mock('../../lib/core/Storm', () => ({
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
            const model = new TestStringModel();
            const schema = ModelMetaStore.getColumn(TestStringModel.name, 'name');
            
            expect(schema.type).toBe('string');
            expect(schema.isNumeric).toBe(false);
            expect(schema.toString('test')).toBe('test');
            expect(schema.fromString('test')).toBe('test');
        });

        test('should register number column correctly', () => {
            const model = new TestNumberModel();
            const schema = ModelMetaStore.getColumn(TestNumberModel.name, 'count');
            
            expect(schema.type).toBe('number');
            expect(schema.isNumeric).toBe(true);
            expect(schema.toString(123)).toBe('123');
            expect(schema.fromString('123')).toBe(123);
        });

        test('should register date column correctly', () => {
            const model = new TestDateModel();
            const schema = ModelMetaStore.getColumn(TestDateModel.name, 'createdAt');
            const testDate = new Date('2025-03-12T16:51:11-04:00');
            
            expect(schema.type).toBe('date');
            expect(schema.isNumeric).toBe(false);
            expect(schema.toString(testDate)).toBe(testDate.toISOString());
            expect(schema.fromString(testDate.toISOString())).toEqual(testDate);
        });

        test('should register json column correctly', () => {
            const model = new TestJsonModel();
            const schema = ModelMetaStore.getColumn(TestJsonModel.name, 'metadata');
            const testJson = { key: 'value', nested: { array: [1, 2, 3] } };
            
            expect(schema.type).toBe('json');
            expect(schema.isNumeric).toBe(false);
            expect(schema.toString(testJson)).toBe(JSON.stringify(testJson));
            expect(schema.fromString(JSON.stringify(testJson))).toEqual(testJson);
        });

        test('should register array column correctly', () => {
            const model = new TestArrayModel();
            const schema = ModelMetaStore.getColumn(TestArrayModel.name, 'tags');
            const testArray = ['tag1', 'tag2', 'tag3'];
            
            expect(schema.type).toBe('array');
            expect(schema.isNumeric).toBe(false);
            expect(schema.toString(testArray)).toBe(JSON.stringify(testArray));
            expect(schema.fromString(JSON.stringify(testArray))).toEqual(testArray);
        });
    });

    describe('Column Options', () => {
        test('should handle indexed columns', () => {
            const model = new TestIndexedModel();
            const schema = ModelMetaStore.getColumn(TestIndexedModel.name, 'indexedField');
            
            expect(schema.index).toBe(true);
        });

        test('should handle unique columns', () => {
            const model = new TestUniqueModel();
            const schema = ModelMetaStore.getColumn(TestUniqueModel.name, 'uniqueField');
            
            expect(schema.unique).toBe(true);
        });

        test('should handle default values', () => {
            const model = new TestDefaultValueModel();
            const schema = ModelMetaStore.getColumn(TestDefaultValueModel.name, 'defaultField');
            
            expect(schema.default).toBe('default-value');
        });
    });

    describe('Edge Cases', () => {
        test('should handle null values', () => {
            const model = new TestStringModel();
            const schema = ModelMetaStore.getColumn(TestStringModel.name, 'name');
            
            expect(schema.toString(null)).toBe('');
            expect(schema.fromString('')).toBe(null);
        });

        test('should handle undefined values', () => {
            const model = new TestStringModel();
            const schema = ModelMetaStore.getColumn(TestStringModel.name, 'name');
            
            expect(schema.toString(undefined)).toBe('');
            expect(schema.fromString('')).toBe(null);
        });

        test('should handle type conversion for numeric fields', () => {
            const model = new TestNumberModel();
            const schema = ModelMetaStore.getColumn(TestNumberModel.name, 'count');
            
            expect(schema.fromString('123.45')).toBe(123.45);
            expect(schema.fromString('-123')).toBe(-123);
            expect(schema.fromString('0')).toBe(0);
        });

        test('should handle invalid date strings', () => {
            const model = new TestDateModel();
            const schema = ModelMetaStore.getColumn(TestDateModel.name, 'createdAt');
            
            const invalidDate = schema.fromString('invalid-date');
            expect(invalidDate.toString()).toBe('Invalid Date');
        });

        test('should handle invalid JSON strings', () => {
            const model = new TestJsonModel();
            const schema = ModelMetaStore.getColumn(TestJsonModel.name, 'metadata');
            
            expect(() => schema.fromString('invalid-json')).toThrow();
        });
    });
});
