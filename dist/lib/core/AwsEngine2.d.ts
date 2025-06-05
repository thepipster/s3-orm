import { Promise } from "bluebird";
import { S3Helper, type S3Options } from "../services/S3Helper";
import { Query } from "../types";
type S3SetItem = {
    setName: string;
    val: string;
    meta: string;
};
export declare class AwsEngine2 {
    aws: S3Helper;
    setCache: Map<string, S3SetItem[]>;
    constructor(opts?: S3Options);
    getObjectTypes(path: string): Promise<string[]>;
    setObject(key: string, obj: any): Promise<void>;
    getObject(key: string): Promise<any>;
    delObject(key: string): Promise<void>;
    hasObject(key: string): Promise<boolean>;
    /**
     * Return a list of objects at the given path. The return keys can be used directly
     * with getObject.
     * @param {*} path
     * @returns
     */
    listObjects(path: string): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    get(key: string): Promise<string>;
    list(path: string, opts?: {
        fullPath?: boolean;
    }): Promise<string[]>;
    set(key: string, val: string): Promise<void>;
    del(key: string): Promise<void>;
    delBatch(keys: string[]): Promise<void>;
    /**
     * If your bucket is not set for public read access, you can call this to set ready
     * just on the folders used by this
     */
    private _loadSet;
    /**
     * Add a value into a unordered set
     * @param {string} setName
     * @param {string} val The value to add to the set
     * @param {string} meta We can also add some meta data associated with this member (S3 only)
     */
    setAdd(setName: string, val: string, meta?: string): Promise<void>;
    /**
     * Return any meta data associated with a set member
     * @param {string} setName
     * @param {string} val
     * @returns
     */
    setGetMeta(setName: string, val: string): Promise<string>;
    setRemove(setName: string, val: string): Promise<void>;
    /**
     * Clear everything from a set
     * @param {string} setName The set name
     */
    setClear(setName: string): Promise<void>;
    setIsMember(setName: string, val: string): Promise<boolean>;
    setMembers(setName: string): Promise<string[]>;
    /**
     * Get the intersection of a number of sets
     * @param {array} keys An array of strings, with each string being the key of the set
     */
    setIntersection(keys: string[]): Promise<string[]>;
    /**
     * zadd
     * @param {string} setName The column field name
     * @param {int} score The score to add (the value to sort by)
     * @param {string} val The value to add to the set (typically the record id)
     */
    zSetAdd(setName: string, score: number, val: string, meta?: string | boolean): Promise<void>;
    zSetRemove(setName: string, score: number, val: string): Promise<void>;
    /**
     * Get tge last item (the max) from the zset as quickly as possible
     * @param {*} setName
     * @param {*} scores
     * @returns
     */
    zGetMax(setName: string, scores?: boolean): Promise<string | {
        score: number;
        val: string;
    }>;
    zGetMin(setName: string, scores?: boolean): Promise<string | {
        score: number;
        val: string;
    }>;
    zSetMembers(setName: string, scores?: boolean): Promise<Array<string | {
        score: number;
        val: string;
    }>>;
    zSetClear(setName: string): Promise<void>;
    /**
     *
     * @param {*} setName
     * @param {*} opts gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns
     */
    zRange(setName: string, opts: Query): Promise<Array<{
        score: number;
        val: string;
    }>>;
}
export {};
//# sourceMappingURL=AwsEngine2.d.ts.map