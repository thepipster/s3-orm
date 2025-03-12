export type ColumnParams = {
    type?: string;
    index?: boolean;
    unique?: boolean;
    default?: any;
};

export type EntityParams = {
    // seconds until the entity expires
    expires?: number; 
    // flag to determine if we add and update a created & modified col
    timestamps?: boolean; 
    onSaveOverride?: callback;
    onUpdateOverride?: callback;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type callbackWithReturn = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type callback = (...args: any[]) => any;

// This is basically an extend version of ColumnParams, but is used 
// internally only. This allows us to add a encode/decode method 
// and other standard properties
export type Field = ColumnParams & {
    name: string,
    isNumeric: boolean,
    onUpdateOverride?: callback
}

// bucket,region,accessKeyId,secretAccessKey



//let qry = {fullName: 'bob'};
//let qry = {fullName: 'ob'};
//let qry = {age: 20};
//let qry = {age: {$gte: 19}};
//let qry = {fullName: 'bob', age: {$gte: 19}};
//let qry:Query = {score:{Op.$gte: 50.56}};

export enum Op {
    $gt = '$gt',
    $gte = '$gte',
    $lt = '$lt',
    $lte = '$lte'
}

  /*
export type Op = {
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
    //$eq?: any;
    //$ne?: any;
    //$in?: any[];
    //$nin?: any[];
    //$exists?: boolean;
    //$size?: number;
    //$type?: string;
    //$mod?: [number, number];
    //$regex?: RegExp;
    //$all?: any[];
    //$elemMatch?: Query;
    //$not?: Query;
    //$nor?: Query[];
    //$or?: Query[];
    //$and?: Query[];
};
*/

export type Query = {
    [key: string]: any;
    order?: string,
    limit?: number, 
    offset?: number 
};

//let qry:Query = {age: {$gte: 19}};
