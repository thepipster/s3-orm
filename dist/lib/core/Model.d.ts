import { Promise } from "bluebird";
import { Query, QueryOptions, type KeyValObject } from "../types";
export declare class Model {
    id: number;
    __v: number;
    constructor(data?: KeyValObject);
    private static _name;
    toJson(): {};
    toString(): string;
    static resetIndex(): Promise<void>;
    /**
     * Return true if a model exists with this id
     * @param {string} id
     */
    static exists(id: number): Promise<Promise<boolean>>;
    static max(fieldName: string): Promise<number | null>;
    static min(fieldName: string): Promise<number | null>;
    static count(query: Query | QueryOptions): Promise<number>;
    /**
     * Normalize the query to ensure it has the correct structure
     * @param query The query to normalize
     * @returns Normalized query options
     */
    private static normalizeQuery;
    static distinct(field: string, query: Query | QueryOptions): Promise<any[]>;
    /**
     * Delete this document from redis, and clear it out from any indices
     */
    remove(): Promise<void>;
    /**
     * Delete a document from redis, and clear it out from any indices
     * @param {string} id The id of the document to delete
     */
    static remove(id: number): Promise<void>;
    save(): Promise<this>;
    private static parseValue;
    static loadFromId(id: number): Promise<Model>;
    static findOne(query: Query | QueryOptions): Promise<Model | Model[] | null>;
    /**
     * Perform a query. Supports simple and compound queries, plus ranges and limits;
     * For example, a range;
     *
     *      aFloat: {
     *           min: 15.0,
     *           max: 22.0
     *       }
     *
     * A range with a limit;
     *
     *       aFloat: {
     *           min: 15.0,
     *           max: 22.0,
     *           limit: 1,
     *           offset: 1
     *       }
     *
     * @param {*} query The query, e.g. {name:'fred'} or {name:'fred', age:25}. Note that
     * query keys must be indexed fields in the schema.
     */
    static find(query: Query | QueryOptions): Promise<Model[] | null>;
    /**
     * Get a list of id's based on the query and options. Supports queries like;
     * Query for all documents where the fullName field contains a substring of 'bob'
     *   qry = {fullName: 'bob'};
     * Query for all documents where the fullName field contains a substring of 'ob' (so bob would match this)
     *   qry = {fullName: 'ob'};
     * Query for all documents where the age = 20
     *   qry = {age: 20};
     * Query for all documents where the age is greater than or equal to 19
     *   qry = {age: {$gte: 19}};
     * Query for all documents where the fullName field contains a substring of 'bob' AND the age is greater than or equal to 19
     *   qry = {fullName: 'bob', age: {$gte: 19}};
     * Query for all documents where the score is les than 50.56
     *   qry = {score: {$lt: 50.56}};
     *
     * @param {QueryOptions} query Support for MongoDB-style operators ($gt, $gte, $lt, $lte, etc)
     * and support for; limit, offset, order (ASC or DESC)
     * @returns
     */
    static getIds(query: Query | QueryOptions): Promise<any[]>;
}
//# sourceMappingURL=Model.d.ts.map