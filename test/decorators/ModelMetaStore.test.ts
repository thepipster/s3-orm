import { ModelMetaStore, type ColumnSchema } from '../../lib/decorators/ModelMetaStore';
import { type EntityParams } from '../../lib/types';

describe('ModelMetaStore', () => {
    beforeEach(() => {
        // Clear the store before each test
        (ModelMetaStore as any).store = new Map();
        (ModelMetaStore as any).entityMetas = new Map();
    });

    describe('Column Management', () => {
        const testModelName = 'TestModel';
        const testColumnSchema: ColumnSchema = {
            name: 'testColumn',
            type: 'string',
            isNumeric: false,
            index: true,
            unique: false,
            toString: (val: any) => String(val),
            fromString: (val: string) => val
        };

        test('addColumn should add a column schema', () => {
            ModelMetaStore.addColumn(testModelName, testColumnSchema);
            const schema = ModelMetaStore.get(testModelName);
            expect(schema[testColumnSchema.name]).toEqual(testColumnSchema);
        });

        test('getColumn should retrieve a column schema', () => {
            ModelMetaStore.addColumn(testModelName, testColumnSchema);
            const column = ModelMetaStore.getColumn(testModelName, testColumnSchema.name);
            expect(column).toEqual(testColumnSchema);
        });

        test('hasColumn should check column existence', () => {
            ModelMetaStore.addColumn(testModelName, testColumnSchema);
            expect(ModelMetaStore.hasColumn(testModelName, testColumnSchema.name)).toBe(true);
            expect(ModelMetaStore.hasColumn(testModelName, 'nonexistentColumn')).toBe(false);
        });

        test('get should retrieve entire model schema', () => {
            ModelMetaStore.addColumn(testModelName, testColumnSchema);
            const schema = ModelMetaStore.get(testModelName);
            expect(schema).toHaveProperty(testColumnSchema.name);
            expect(schema[testColumnSchema.name]).toEqual(testColumnSchema);
        });

        test('getColumn should throw error for non-existent model', () => {
            expect(() => {
                ModelMetaStore.getColumn('NonExistentModel', 'someColumn');
            }).toThrow('Model NonExistentModel not found!');
        });

        test('getColumn should throw error for non-existent column', () => {
            ModelMetaStore.addColumn(testModelName, testColumnSchema);
            expect(() => {
                ModelMetaStore.getColumn(testModelName, 'nonexistentColumn');
            }).toThrow(`Model ${testModelName} not no column called nonexistentColumn!`);
        });
    });

    describe('Entity Metadata Management', () => {
        const testModelName = 'TestModel';
        const testEntityMeta: EntityParams = {
            timestamps: true,
            expires: 3600
        };

        test('addColumnMeta should store entity metadata', () => {
            ModelMetaStore.addColumnMeta(testModelName, testEntityMeta);
            const meta = (ModelMetaStore as any).entityMetas.get(testModelName);
            expect(meta).toEqual(testEntityMeta);
        });

        test('should handle multiple models with different metadata', () => {
            const model1 = 'Model1';
            const model2 = 'Model2';
            const meta1: EntityParams = { timestamps: true };
            const meta2: EntityParams = { expires: 7200 };

            ModelMetaStore.addColumnMeta(model1, meta1);
            ModelMetaStore.addColumnMeta(model2, meta2);

            const storedMeta1 = (ModelMetaStore as any).entityMetas.get(model1);
            const storedMeta2 = (ModelMetaStore as any).entityMetas.get(model2);

            expect(storedMeta1).toEqual(meta1);
            expect(storedMeta2).toEqual(meta2);
        });
    });

    describe('Complex Schema Management', () => {
        const testModelName = 'ComplexModel';
        
        test('should handle multiple columns with different types', () => {
            const columns: ColumnSchema[] = [
                {
                    name: 'stringField',
                    type: 'string',
                    isNumeric: false,
                    toString: (val: any) => String(val),
                    fromString: (val: string) => val
                },
                {
                    name: 'numberField',
                    type: 'number',
                    isNumeric: true,
                    toString: (val: any) => String(val),
                    fromString: (val: string) => Number(val)
                },
                {
                    name: 'dateField',
                    type: 'date',
                    isNumeric: false,
                    toString: (val: any) => val instanceof Date ? val.toISOString() : val,
                    fromString: (val: string) => new Date(val)
                },
                {
                    name: 'jsonField',
                    type: 'json',
                    isNumeric: false,
                    toString: (val: any) => JSON.stringify(val),
                    fromString: (val: string) => JSON.parse(val)
                }
            ];

            columns.forEach(column => {
                ModelMetaStore.addColumn(testModelName, column);
            });

            const schema = ModelMetaStore.get(testModelName);
            columns.forEach(column => {
                expect(schema[column.name]).toEqual(column);
            });
        });

        test('should handle schema updates', () => {
            const originalColumn: ColumnSchema = {
                name: 'updateField',
                type: 'string',
                isNumeric: false,
                toString: (val: any) => String(val),
                fromString: (val: string) => val
            };

            const updatedColumn: ColumnSchema = {
                ...originalColumn,
                type: 'number',
                isNumeric: true,
                fromString: (val: string) => Number(val)
            };

            ModelMetaStore.addColumn(testModelName, originalColumn);
            ModelMetaStore.addColumn(testModelName, updatedColumn);

            const schema = ModelMetaStore.get(testModelName);
            expect(schema[originalColumn.name]).toEqual(updatedColumn);
        });
    });
});
