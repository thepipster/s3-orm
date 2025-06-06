import { S3Client } from "@aws-sdk/client-s3";

export type ConfigOptions = {
    bucket?: string,
    prefix?: string,
    region?: string,
    rootUrl?: string,
    accessKeyId?: string,
    secretAccessKey?: string,
    sessionToken?: string; // Optional, for temporary credentials
    indexingEngine?: string,
    s3Client?: S3Client
}

export const StashDefaultConfig: ConfigOptions = {
    bucket: '',
    prefix: '',
    region: 'us-east-1',
    rootUrl: 's3orm/',
    accessKeyId: '',
    secretAccessKey: '',
    indexingEngine: 'basic',
    s3Client: undefined,
    sessionToken: undefined
}

export type ColumnParams = {
    type?:  string, // 'boolean' | 'text' | 'date' | 'integer' | 'float' | 'json' | 'array';
    index?: boolean;
    unique?: boolean;
    default?: any;
    enum?: string[] | object; // enum type or array of strings
    encode?: callback;
    decode?: callback;
};

export type EntityParams = {
    // seconds until the entity expires
    expires?: number; 
    // flag to determine if we add and update a created & modified col
    timestamps?: boolean; 
    //onSaveOverride?: callback;
    //onUpdateOverride?: callback;
};

export type KeyValObject =  {
    [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type callbackWithReturn = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type callback = (...args: any[]) => any;

export enum Op {
    $gt = '$gt',
    $gte = '$gte',
    $lt = '$lt',
    $lte = '$lte'
}

export type Query = {
    [key: string]: any;
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
}

export type QueryOptions = {
    where?: Query;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
    scores?: boolean;
};
