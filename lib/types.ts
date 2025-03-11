export type ColumnParams = {
    type?: string;
    index?: boolean;
    defaultValue?: any;
    //expires?: number;
};

export type EntityParams = {
    expires?: number; // seconds until the entity expires
    onSaveOverride?: callback;
    onUpdateOverride?: callback;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type callbackWithReturn = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type callback = (...args: any[]) => any;

export type Field = {
    name: string,
    type: string,
    index?: boolean,
    defaultValue?: string|callbackWithReturn,
    onUpdateOverride?: callback
}

// bucket,region,accessKeyId,secretAccessKey

export type S3Options = {
    bucket: string;
    prefix: string;
    region?: string;
    rootUrl?: string;
    acl?: string;
    accessKeyId: string;
    secretAccessKey: string;
}

export type QueryOperator = {
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
    $eq?: any;
    $ne?: any;
    $in?: any[];
    $nin?: any[];
    $exists?: boolean;
    $size?: number;
    $type?: string;
    $mod?: [number, number];
    $regex?: RegExp;
    $all?: any[];
    $elemMatch?: Query;
    $not?: Query;
    $nor?: Query[];
    $or?: Query[];
    $and?: Query[];
};

export type Query = {
    [key: string]: any | QueryOperator;
};