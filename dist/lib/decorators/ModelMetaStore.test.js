"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ModelMetaStore_1 = require("./ModelMetaStore");
describe('ModelMetaStore', () => {
    beforeEach(() => {
        // Clear the ModelMetaStore before each test
        ModelMetaStore_1.ModelMetaStore.store = new Map();
        ModelMetaStore_1.ModelMetaStore.entityMetas = new Map();
    });
    describe('Column Management', () => {
        test('should add a column to a model', () => {
            const modelName = 'TestModel';
            const columnSchema = {
                name: 'testColumn',
                type: 'string',
                isNumeric: false,
                encode: (val) => String(val),
                decode: (val) => val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(modelName, columnSchema);
            // Verify column was added - the model should be created automatically
            const model = ModelMetaStore_1.ModelMetaStore.get(modelName);
            expect(model.testColumn).toBeDefined();
            expect(model.testColumn.type).toBe('string');
        });
        test('should retrieve a specific column', () => {
            const modelName = 'TestModel';
            const columnSchema = {
                name: 'testColumn',
                type: 'string',
                isNumeric: false,
                encode: (val) => String(val),
                decode: (val) => val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(modelName, columnSchema);
            // Retrieve the column
            const column = ModelMetaStore_1.ModelMetaStore.getColumn(modelName, 'testColumn');
            expect(column).toBeDefined();
            expect(column.name).toBe('testColumn');
            expect(column.type).toBe('string');
        });
        test('should throw error when retrieving non-existent column', () => {
            const modelName = 'TestModel';
            // Add a different column to ensure the model exists
            const columnSchema = {
                name: 'existingColumn',
                type: 'string',
                isNumeric: false,
                encode: (val) => String(val),
                decode: (val) => val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(modelName, columnSchema);
            // Try to retrieve a column that doesn't exist
            expect(() => {
                ModelMetaStore_1.ModelMetaStore.getColumn(modelName, 'nonExistentColumn');
            }).toThrow();
        });
        test('should check if a column exists', () => {
            const modelName = 'TestModel';
            const columnSchema = {
                name: 'testColumn',
                type: 'string',
                isNumeric: false,
                encode: (val) => String(val),
                decode: (val) => val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(modelName, columnSchema);
            expect(ModelMetaStore_1.ModelMetaStore.hasColumn(modelName, 'testColumn')).toBe(true);
            expect(ModelMetaStore_1.ModelMetaStore.hasColumn(modelName, 'nonExistentColumn')).toBe(false);
        });
    });
    describe('Model Retrieval', () => {
        test('should retrieve a model by name', () => {
            const modelName = 'TestModel';
            // Add a column to ensure the model exists
            const columnSchema = {
                name: 'testColumn',
                type: 'string',
                isNumeric: false,
                encode: (val) => String(val),
                decode: (val) => val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(modelName, columnSchema);
            const model = ModelMetaStore_1.ModelMetaStore.get(modelName);
            expect(model).toBeDefined();
            expect(model.testColumn).toBeDefined();
        });
        test('should throw error when retrieving non-existent model', () => {
            // Try to retrieve a model that doesn't exist
            expect(() => {
                ModelMetaStore_1.ModelMetaStore.get('NonExistentModel');
            }).toThrow('Model NonExistentModel not found!');
        });
    });
    describe('Entity Metadata', () => {
        test('should store entity metadata', () => {
            const modelName = 'TestModel';
            const entityParams = { timestamps: true, expires: 3600 };
            // Store entity metadata
            ModelMetaStore_1.ModelMetaStore.addColumnMeta(modelName, entityParams);
            // Access the private entityMetas map to verify
            const entityMetas = ModelMetaStore_1.ModelMetaStore.entityMetas;
            const storedParams = entityMetas.get(modelName);
            expect(storedParams).toBeDefined();
            expect(storedParams.timestamps).toBe(true);
            expect(storedParams.expires).toBe(3600);
        });
    });
});
//# sourceMappingURL=ModelMetaStore.test.js.map