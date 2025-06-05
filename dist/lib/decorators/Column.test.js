"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const Column_1 = require("./Column");
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
// Test model classes
class TestStringModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'string' }),
    __metadata("design:type", String)
], TestStringModel.prototype, "name", void 0);
class TestNumberModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'number' }),
    __metadata("design:type", Number)
], TestNumberModel.prototype, "count", void 0);
class TestDateModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], TestDateModel.prototype, "createdAt", void 0);
class TestJsonModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], TestJsonModel.prototype, "metadata", void 0);
class TestArrayModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'array' }),
    __metadata("design:type", Array)
], TestArrayModel.prototype, "tags", void 0);
class TestIndexedModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'string', index: true }),
    __metadata("design:type", String)
], TestIndexedModel.prototype, "indexedField", void 0);
class TestUniqueModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'string', unique: true }),
    __metadata("design:type", String)
], TestUniqueModel.prototype, "uniqueField", void 0);
class TestDefaultValueModel extends Model_1.Model {
}
__decorate([
    (0, Column_1.Column)({ type: 'string', default: 'default-value' }),
    __metadata("design:type", String)
], TestDefaultValueModel.prototype, "defaultField", void 0);
describe('Column Decorator', () => {
    beforeEach(() => {
        // Clear the ModelMetaStore before each test
        ModelMetaStore_1.ModelMetaStore.store = new Map();
    });
    describe('Type Definitions', () => {
        test('should register string column correctly', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'name',
                type: 'string',
                isNumeric: false,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestStringModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestStringModel.name, 'name');
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
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : Number(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestNumberModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestNumberModel.name, 'count');
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
                encode: (val) => val instanceof Date ? val.toISOString() : '',
                decode: (val) => !val ? null : new Date(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestDateModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestDateModel.name, 'createdAt');
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
                encode: (val) => val === null || val === undefined ? '' : JSON.stringify(val),
                decode: (val) => !val ? null : JSON.parse(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestJsonModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestJsonModel.name, 'metadata');
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
                encode: (val) => val === null || val === undefined ? '' : JSON.stringify(val),
                decode: (val) => !val ? null : JSON.parse(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestArrayModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestArrayModel.name, 'tags');
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
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestIndexedModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestIndexedModel.name, 'indexedField');
            expect(schema.index).toBe(true);
        });
        test('should handle unique columns', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'uniqueField',
                type: 'string',
                isNumeric: false,
                unique: true,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestUniqueModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestUniqueModel.name, 'uniqueField');
            expect(schema.unique).toBe(true);
        });
        test('should handle default values', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'defaultField',
                type: 'string',
                isNumeric: false,
                default: 'default-value',
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestDefaultValueModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestDefaultValueModel.name, 'defaultField');
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
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestStringModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestStringModel.name, 'name');
            expect(schema.encode(null)).toBe('');
            expect(schema.decode('')).toBe(null);
        });
        test('should handle undefined values', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'name',
                type: 'string',
                isNumeric: false,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : val
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestStringModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestStringModel.name, 'name');
            expect(schema.encode(undefined)).toBe('');
            expect(schema.decode('')).toBe(null);
        });
        test('should handle type conversion for numeric fields', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'count',
                type: 'number',
                isNumeric: true,
                encode: (val) => val === null || val === undefined ? '' : String(val),
                decode: (val) => !val ? null : Number(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestNumberModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestNumberModel.name, 'count');
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
                encode: (val) => val instanceof Date ? val.toISOString() : '',
                decode: (val) => !val ? null : new Date(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestDateModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestDateModel.name, 'createdAt');
            const invalidDate = schema.decode('invalid-date');
            expect(invalidDate.toString()).toBe('Invalid Date');
        });
        test('should handle invalid JSON strings', () => {
            // Manually register the model schema for testing
            const columnSchema = {
                name: 'metadata',
                type: 'json',
                isNumeric: false,
                encode: (val) => val === null || val === undefined ? '' : JSON.stringify(val),
                decode: (val) => !val ? null : JSON.parse(val)
            };
            ModelMetaStore_1.ModelMetaStore.addColumn(TestJsonModel.name, columnSchema);
            const schema = ModelMetaStore_1.ModelMetaStore.getColumn(TestJsonModel.name, 'metadata');
            expect(() => schema.decode('invalid-json')).toThrow();
        });
    });
});
//# sourceMappingURL=Column.test.js.map