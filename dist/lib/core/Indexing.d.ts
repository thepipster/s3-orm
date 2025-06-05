import { type ColumnSchema, type ModelSchema } from "../decorators/ModelMetaStore";
import { Promise } from "bluebird";
import { Query } from "../types";
export declare class Indexing {
    id: number;
    schema: ModelSchema;
    modelName: string;
    constructor(id: number, modelName: string);
    _checkKey(key: string): ColumnSchema;
    _isNull(val: number | string): val is "";
    /**
     *
     * @param {*} fieldName
     * @param {*} val
     * @returns
     */
    isMemberUniques(fieldName: string, val: string): Promise<boolean>;
    clearUniques(fieldName: string): Promise<Promise<void>>;
    getUniques(fieldName: string): Promise<Promise<string[]>>;
    removeUnique(fieldName: any, val: any): Promise<void>;
    addUnique(fieldName: string, val: any): Promise<void>;
    /**
     * Remove a simple index
     * @param {*} fieldName
     * @param {*} val
     */
    remove(fieldName: any, val: any): Promise<void>;
    /**
     * Add a simple index for a value
     * @param {*} fieldName
     * @param {*} val
     */
    add(fieldName: string, val: any): Promise<void>;
    /**
     * Get all the basic (string) index values for the given fieldName
     * @param {*} fieldName
     * @returns
     */
    list(fieldName: any): Promise<Promise<string[]>>;
    /**
     * Clear the entire index for the given fieldName
     * @param {*} fieldName
     * @returns Number of items removed
     */
    clear(fieldName: any): Promise<number>;
    /**
     * Perform a search on a basic (string) index
     * @param {*} fieldName
     * @param {*} searchVal
     * @returns
     */
    search(fieldName: any, searchVal: any): Promise<any[]>;
    getNumerics(fieldName: any): Promise<Promise<(string | {
        score: number;
        val: string;
    })[]>>;
    clearNumerics(fieldName: any): Promise<Promise<void>>;
    addNumeric(fieldName: string, val: number): Promise<void>;
    removeNumeric(fieldName: string, val: number): Promise<void>;
    /**
     * Search on a numeric index, returning an array of id's that match the query
     * @param {string} fieldName
     * @param {object} query gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns
     */
    searchNumeric(fieldName: string, query: Query): Promise<any>;
    getIndexName(modelName: string, fieldName?: string): string;
    /**
     * As tracking the last id used for models is used a lot (when we create a new model instance)
     * it makes sense to cache id's as a special case
     */
    setMaxId(id: number): Promise<void>;
    getMaxId(): Promise<number>;
    removeIndexForField(key: any, val: any): Promise<void>;
    setIndexForField(key: string, val: any, oldVal: any): Promise<void>;
    /**
     * Loop through the indices for this model, and reset. That is, make
     * sure they are correct and aren't corrupt
     */
    cleanIndices(): Promise<void>;
    /**
     * Add a expire index, that will expire the entire model instance
     * @param {integer} expireTime Seconds in the future that this will expire
     */
    addExpires(expireTime: number): Promise<void>;
}
//# sourceMappingURL=Indexing.d.ts.map