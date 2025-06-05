import { type ColumnParams } from "../types";
import { type EntityParams } from "../types";
export type ColumnSchema = ColumnParams & {
    name: string;
    isNumeric: boolean;
};
export type ModelSchema = {
    [key: string]: ColumnSchema;
};
export declare class ModelMetaStore {
    private static store;
    private static entityMetas;
    static addColumnMeta(modelName: string, meta: EntityParams): void;
    /**
     * Get the schema (meta data) for the given column and model
     * @param modelName
     * @param columnName
     * @returns
     */
    static getColumn(modelName: string, columnName: string): ColumnSchema;
    static hasColumn(modelName: string, columnName: string): boolean;
    static get(modelName: string): ModelSchema;
    static addColumn(modelName: string, meta: ColumnSchema): void;
}
//# sourceMappingURL=ModelMetaStore.d.ts.map