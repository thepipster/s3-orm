import { S3Client } from "@aws-sdk/client-s3";
export type ConfigOptions = {
    bucket?: string;
    prefix?: string;
    region?: string;
    rootUrl?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    indexingEngine?: string;
    s3Client?: S3Client;
};
export declare const StashDefaultConfig: ConfigOptions;
export type ColumnParams = {
    type?: string;
    index?: boolean;
    unique?: boolean;
    default?: any;
    encode?: callback;
    decode?: callback;
};
export type EntityParams = {
    expires?: number;
    timestamps?: boolean;
};
export type KeyValObject = {
    [key: string]: any;
};
export type callbackWithReturn = (...args: any[]) => any;
export type callback = (...args: any[]) => any;
export declare enum Op {
    $gt = "$gt",
    $gte = "$gte",
    $lt = "$lt",
    $lte = "$lte"
}
export type Query = {
    [key: string]: any;
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
};
export type QueryOptions = {
    where?: Query;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
    scores?: boolean;
};
//# sourceMappingURL=types.d.ts.map