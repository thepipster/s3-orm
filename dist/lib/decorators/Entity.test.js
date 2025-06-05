"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Entity_1 = require("./Entity");
const Model_1 = require("../core/Model");
const ModelMetaStore_1 = require("./ModelMetaStore");
// Mock Stash for Model class
jest.mock('../core/Stash', () => ({
    Stash: {
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
        ModelMetaStore_1.ModelMetaStore.store = new Map();
        ModelMetaStore_1.ModelMetaStore.entityMetas = new Map();
    });
    describe('Entity Options', () => {
        test('should register entity with timestamps option', () => {
            // Apply the Entity decorator directly to a class
            let TestModel = class TestModel extends Model_1.Model {
            };
            TestModel = __decorate([
                (0, Entity_1.Entity)({ timestamps: true })
            ], TestModel);
            // Register a column to ensure the model exists in the store
            const testColumn = {
                name: 'test',
                type: 'string',
                isNumeric: false,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn('TestModel', testColumn);
            // Manually apply the Entity decorator to ensure it's executed
            (0, Entity_1.Entity)({ timestamps: true })(TestModel);
            // Access the private entityMetas map to verify the options
            const entityMetas = ModelMetaStore_1.ModelMetaStore.entityMetas;
            const options = entityMetas.get('TestModel');
            expect(options).toBeDefined();
            expect(options.timestamps).toBe(true);
        });
        test('should use default options when not specified', () => {
            // Apply the Entity decorator directly to a class
            let DefaultModel = class DefaultModel extends Model_1.Model {
            };
            DefaultModel = __decorate([
                (0, Entity_1.Entity)()
            ], DefaultModel);
            // Register a column to ensure the model exists in the store
            const testColumn = {
                name: 'test',
                type: 'string',
                isNumeric: false,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn('DefaultModel', testColumn);
            // Manually apply the Entity decorator to ensure it's executed
            (0, Entity_1.Entity)()(DefaultModel);
            // Access the private entityMetas map to verify the options
            const entityMetas = ModelMetaStore_1.ModelMetaStore.entityMetas;
            const options = entityMetas.get('DefaultModel');
            expect(options).toBeDefined();
            expect(options).toEqual({});
        });
    });
    describe('Entity Decorator Application', () => {
        test('should apply decorator with multiple options', () => {
            // Create a class and apply the Entity decorator manually
            class TestOptionsModel extends Model_1.Model {
            }
            // Register a column to ensure the model exists in the store
            const testColumn = {
                name: 'test',
                type: 'string',
                isNumeric: false,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn('TestOptionsModel', testColumn);
            // Apply the decorator manually with multiple options
            (0, Entity_1.Entity)({ timestamps: true, expires: 3600 })(TestOptionsModel);
            // Access the private entityMetas map to verify the decorator was applied
            const entityMetas = ModelMetaStore_1.ModelMetaStore.entityMetas;
            expect(entityMetas.has('TestOptionsModel')).toBe(true);
            const options = entityMetas.get('TestOptionsModel');
            expect(options).toBeDefined();
            expect(options.timestamps).toBe(true);
            expect(options.expires).toBe(3600);
        });
    });
});
//# sourceMappingURL=Entity.test.js.map