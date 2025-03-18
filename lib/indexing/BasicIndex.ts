import Logger from "../utils/Logger";
import { Storm } from "../core/Storm";
import { ModelMetaStore, type ModelSchema, type ColumnSchema } from "../decorators/ModelMetaStore";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import {Promise} from "bluebird";
import {Query} from "../types";
import UniqueKeyViolationError from "../errors/UniqueKeyViolationError";

export class NumericIndex {

    indexRootPath: string = "s3orm/";
    schema: ModelSchema = {};
    modelName: string = "";
    rootKey?: string;
    private paddingLength: number = 10;

    constructor(modelName: string) {
        this.schema = ModelMetaStore.get(modelName);
        this.modelName = modelName;
        this.indexRootPath = Storm.rootPath + "indexes/";
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Add a new index, if there is a previous value, delete it first unless
     * the column has a unique index.
     * @param id 
     * @param colName 
     * @param val 
     * @param prevVal 
     */
    async add(id: number, colName: string, val: number, prevVal: number): Promise<void> {
        
        const defn = ModelMetaStore.getColumn(this.modelName, colName);

        // Add new index
        const newPrefix:string = this._getPrefix(colName, val, defn);
        const newKey:string = `${newPrefix}###${id}`;

        // If this is a unique index, we need to check this value doesn't already exist
        if (defn.unique){
            const results = await Promise.all({
                // Check if the prefix is taken (i.e. this or another record has this value)
                prefix: await Storm.aws().exists(newPrefix),
                // Check if the prefix is taken, and with this id (i.e. this record exists, 
                // but its from the same record)
                key: await Storm.aws().exists(newKey)
            });
            if (results.prefix && !results.key){
                throw new UniqueKeyViolationError(`${colName} = ${val} is unique, and already exists`);
            }
        }

        // Delete old index (if there is one)
        if (prevVal != undefined && prevVal != null) {
            const oldPrefix:string = this._getPrefix(colName, prevVal, defn);
            await Storm.aws().delete(`${oldPrefix}###${id}`);
        }
        
        // /await Storm.s3().get(`${this.getNodeKey(colName, prevVal)}`);
        Logger.debug(`Setting index at ${newKey}`);

        await Storm.aws().uploadString(newKey, id.toString());

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async getIds(colName: string, query: Query): Promise<number[]> {


        let shard0:number = query.$gt || query.$gte || 0;
        let shard1:number = query.$lt || query.$lte || Number.MAX_SAFE_INTEGER;

        const defn = ModelMetaStore.getColumn(this.modelName, colName);

        // To deal with floats, we multiply by a 100 so the padding still is effective
        // for indexing (ordering the file listing)
        if (defn.type == 'float') {
            shard0 = shard0 * 100;
            shard1 = shard1 * 100;
        }

        let files: string[] = await this.listFilesInRange(colName, shard0, shard1);
        let ids: number[] = [];

        for (let i = 0; i < files.length; i++) {
            let idStr: string = files[i].split("###")[1];
            ids.push(parseInt(idStr)); 
        }
        
        return ids;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////
    
    private async listFilesInRange(colName: string, startNum: number, endNum: number) {

        const defn = ModelMetaStore.getColumn(this.modelName, colName);
        const startPrefix:string = this._getPrefix(colName, startNum, defn);
        const endPrefix:string = this._getPrefix(colName, endNum, defn); 
        //`${basePrefix}${String(endNum).padStart(this.paddingLength, '0')}`;
    
        let files = [];
        let continuationToken = null;
    
        do {
            const params = {
                Bucket: Storm.aws().opts.bucket,
                Prefix: startPrefix, // Start listing from the closest match
                MaxKeys: 1000,
                ContinuationToken: continuationToken,
            };
    
            const response = await Storm.aws().s3.send(new ListObjectsV2Command(params));
    
            if (!response.Contents) break;
    
            for (const obj of response.Contents) {
                
                const fileKey = obj.Key;

                if (fileKey > endPrefix) {
                    return files; // Stop fetching when we exceed the upper bound
                }
    
                const fileName = fileKey.split('/').pop(); // Get filename

                if (/^\d+$/.test(fileName)) { // Ensure it's numeric
                    files.push(fileKey);
                }
            }
    
            continuationToken = response.NextContinuationToken;

        } while (continuationToken); // Continue only if more results exist
    
        return files;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Use a padding scheme to ensure files are ordered by their numeric value
     * and can be fetched using a prefix pattern.
     * @param colName 
     * @param val 
     * @returns 
     */
    _getPrefix(colName: string, val: number, defn: ColumnSchema): string {

        if (val == undefined || val == null) {
            throw new Error(`Value cannot be null or undefined`);
        }

        //if (!defn){
        //    defn = ModelMetaStore.getColumn(this.modelName, colName);
        //}

        if (defn.type !== 'float') {
            let basePrefix = `${this.indexRootPath}${this.modelName}/${colName}/`;
            return `${basePrefix}${String(val).padStart(this.paddingLength, '0')}`;    
        }
        else {
            let basePrefix = `${this.indexRootPath}${this.modelName}/${colName}/`;
            return `${basePrefix}${String(val*100).padStart(this.paddingLength, '0')}`;    
        }

    }    
    
}