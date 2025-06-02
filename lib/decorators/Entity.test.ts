import { Entity } from './Entity';
import { Column } from './Column';
import { Model } from '../core/Model';
import { ModelMetaStore } from './ModelMetaStore';
import { type ColumnSchema } from './ModelMetaStore';

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

describe('Entity Decorator', () => {
    beforeEach(() => {
        // Clear the ModelMetaStore before each test
        (ModelMetaStore as any).store = new Map();
        (ModelMetaStore as any).entityMetas = new Map();
    });

    describe('Entity Options', () => {
        test('should register entity with timestamps option', () => {
            // Apply the Entity decorator directly to a class
            @Entity({ timestamps: true })
            class TestModel extends Model {}
            
            // Register a column to ensure the model exists in the store
            const testColumn: ColumnSchema = {
                name: 'test',
                type: 'string',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            
            ModelMetaStore.addColumn('TestModel', testColumn);
            
            // Manually apply the Entity decorator to ensure it's executed
            Entity({ timestamps: true })(TestModel);
            
            // Access the private entityMetas map to verify the options
            const entityMetas = (ModelMetaStore as any).entityMetas;
            const options = entityMetas.get('TestModel');
            
            expect(options).toBeDefined();
            expect(options.timestamps).toBe(true);
        });

        test('should use default options when not specified', () => {
            // Apply the Entity decorator directly to a class
            @Entity()
            class DefaultModel extends Model {}
            
            // Register a column to ensure the model exists in the store
            const testColumn: ColumnSchema = {
                name: 'test',
                type: 'string',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            
            ModelMetaStore.addColumn('DefaultModel', testColumn);
            
            // Manually apply the Entity decorator to ensure it's executed
            Entity()(DefaultModel);
            
            // Access the private entityMetas map to verify the options
            const entityMetas = (ModelMetaStore as any).entityMetas;
            const options = entityMetas.get('DefaultModel');
            
            expect(options).toBeDefined();
            expect(options).toEqual({});
        });
    });

    describe('Entity Decorator Application', () => {
        test('should apply decorator with multiple options', () => {
            // Create a class and apply the Entity decorator manually
            class TestOptionsModel extends Model {}
            
            // Register a column to ensure the model exists in the store
            const testColumn: ColumnSchema = {
                name: 'test',
                type: 'string',
                isNumeric: false,
                encode: (val: any) => val === null || val === undefined ? '' : String(val),
                decode: (val: string) => !val ? null : val
            };
            
            ModelMetaStore.addColumn('TestOptionsModel', testColumn);
            
            // Apply the decorator manually with multiple options
            Entity({ timestamps: true, expires: 3600 })(TestOptionsModel);
            
            // Access the private entityMetas map to verify the decorator was applied
            const entityMetas = (ModelMetaStore as any).entityMetas;
            expect(entityMetas.has('TestOptionsModel')).toBe(true);
            
            const options = entityMetas.get('TestOptionsModel');
            expect(options).toBeDefined();
            expect(options.timestamps).toBe(true);
            expect(options.expires).toBe(3600);
        });
    });
});
