import Logger from "../utils/Logger";
import { Stash } from "../core/Stash";
import { ModelMetaStore, type ModelSchema, type ColumnSchema } from "../decorators/ModelMetaStore";
import { ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import {Promise} from "bluebird";
import {Query} from "../types";
import UniqueKeyViolationError from "../errors/UniqueKeyViolationError";


export class NumericIndex {

    indexRootPath: string = "s3orm/";
    schema: ModelSchema = {};
    modelName: string = "";
    rootKey?: string;

    private shardSize: number = 10;
    private paddingLength: number = 10;
    private shardPaddingLength: number = 5;

    constructor(modelName: string) {
        this.schema = ModelMetaStore.get(modelName);
        this.modelName = modelName;
        this.indexRootPath = Stash.rootPath + "indexes/";
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
    async add(id: number, colName: string, val: number, prevVal?: number): Promise<void> {
        
        const defn = ModelMetaStore.getColumn(this.modelName, colName);

        // Add new index
        const newPrefix:string = this._getPrefix(colName, val, defn);
        const newKey:string = `${newPrefix}###${id}`;

        //Logger.debug(`newPrefix = ${newPrefix}`);
        //Logger.debug(`newKey = ${newKey}`);

        // If this is a unique index, we need to check this value doesn't already exist        
        if (defn.unique){
            const results = await Promise.all({
                // Check if the prefix is taken (i.e. this or another record has this value)
                prefix: await Stash.aws().exists(newPrefix),
                // Check if the prefix is taken, and with this id (i.e. this record exists, 
                // but its from the same record)
                key: await Stash.aws().exists(newKey)
            });
            if (results.prefix && !results.key){
                throw new UniqueKeyViolationError(`${colName} = ${val} is unique, and already exists`);
            }
        }

        // Delete old index (if there is one)
        if (prevVal != undefined && prevVal != null) {
            const oldPrefix:string = this._getPrefix(colName, prevVal, defn);
            await Stash.aws().delete(`${oldPrefix}###${id}`);
            //await Stash.aws().delete(oldPrefix);
        }

        // /await Stash.s3().get(`${this.getNodeKey(colName, prevVal)}`);
        //Logger.debug(`Setting index at ${newKey}`);

        await Stash.aws().uploadString(id.toString(), newKey);

    }

    /*

    private async listObjectsByShards(bucketName, shardSize = 10, totalDigits = 3) {
        const allFiles = [];
    
        for (let i = 0; i < Math.pow(10, totalDigits); i += shardSize) {
            const prefix = getPaddedPrefix(i, totalDigits); // Get zero-padded prefix
    
            console.log(`Fetching files with prefix: ${prefix}`);
    
            const command = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix, // Use numeric prefix as a shard key
            });
    
            try {
                const response = await s3Client.send(command);
                if (response.Contents && response.Contents.length > 0) {
                    allFiles.push(...response.Contents.map(obj => obj.Key));
                } else {
                    console.log(`No files found for prefix: ${prefix}, stopping early.`);
                    break;
                }
            } catch (err) {
                console.error(`Error fetching prefix ${prefix}:`, err);
            }
        }
    
        console.log("Final file list:", allFiles);
        return allFiles;
    }
        */

    // ///////////////////////////////////////////////////////////////////////////////////////

    getShardKey(val: number): string {
        return String(Math.floor(val / this.shardSize)).padStart(this.shardPaddingLength, "0");
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    // Example Usage
    /*

    For shard size of 1000, the following keys will be generated:

     Number     Shard      Key
      24        0          00000-0000000024
      107       1          00001-0000000107
      842       8          00008-0000000842
     1307       13         00013-0000001307

     Or just store a json doc at each shard key with the list of ids

    */

    getPaddedPrefix(number) {
        return String(number).padStart(this.paddingLength, "0");
    }

    /**
     * Extracts the most significant digit and scales it back to the correct magnitude,
     * e.g. 86600 becomes 80000, 435 becomes 400, etc.
     * @param num 
     * @returns 
     */
    mostSignificantDigitNumbers(num: number) {
        if (num === 0) return 0; // Handle edge case for zero
        let magnitude = Math.pow(10, Math.floor(Math.log10(num)));
        let msd = Math.floor(num / magnitude);
        return msd * magnitude;
    }


    async getIds(colName: string, query: Query): Promise<number[]> {

        const minVal = 100;

        let gt:number = (query.$gt) ? query.$gt : query.$gte;
        let lt:number = (query.$lt) ? query.$lt : query.$lte;

        if (!gt){
            gt = 0;
        }

        if (!lt){
            lt = Number.MAX_SAFE_INTEGER;
        }


        // First find how many shard keys are there between the two values

        let shard0:number = Math.floor(gt / this.shardSize);
        let shard1:number = Math.floor(lt / this.shardSize);

        // Iterate over the shard keys and fetch the files


        /*

        const allFiles = [];
        const defn = ModelMetaStore.getColumn(this.modelName, colName);
    
        let n0: number = this.mostSignificantDigitNumbers(shard0);
        let shardKey = 
        let startPrefix:string = this._getPrefix(colName, n0, defn);

        startPrefix = startPrefix.slice(0, -n0.toString().length+1);

        Logger.debug(`Fetching files with prefix: ${startPrefix}`);

        let continuationToken = null;

        const params = {
            Bucket: Stash.aws().opts.bucket,
            Delimiter: 's3orm/indexes/Person/score/',
            Prefix: startPrefix, // Start listing from the closest match
            MaxKeys: 1000,
            ContinuationToken: continuationToken
        };

        const response = await Stash.aws().s3.send(new ListObjectsV2Command(params)) as ListObjectsV2CommandOutput;

        Logger.debug(response);

        if (response.Contents && response.Contents.length > 0) {
            allFiles.push(...response.Contents.map(obj => obj.Key));
        } else {
            Logger.debug(`No files found for prefix: ${startPrefix}, stopping early.`);
            //break;
        }


    
        console.log("Final file list:", allFiles);
        return allFiles;


*/

        /*
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
        */
    }

    // ///////////////////////////////////////////////////////////////////////////////////////
    
    private async listFilesInRange(colName: string, startNum: number, endNum: number) {

        const defn = ModelMetaStore.getColumn(this.modelName, colName);
        const startPrefix:string = this._getPrefix(colName, startNum, defn);
        const endPrefix:string = this._getPrefix(colName, endNum, defn); 
        //`${basePrefix}${String(endNum).padStart(this.paddingLength, '0')}`;
    
        let files = [];
        let continuationToken = null;
        let isMore: boolean = true;
    
        // Continue only if more results exist
        while (isMore) { 

            const params = {
                Bucket: Stash.aws().opts.bucket,
                Prefix: startPrefix, // Start listing from the closest match
                MaxKeys: 1000,
                ContinuationToken: continuationToken,
            };
    
            Logger.debug(`Getting files with prefix ${startPrefix}`);
            const response = await Stash.aws().s3.send(new ListObjectsV2Command(params)) as ListObjectsV2CommandOutput;
    
            //const response = await this._read(command) ;
            Logger.info(response.Contents)

            if (!response.Contents) {
                isMore = false;
            }
            else {
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
            }
    

    
            continuationToken = response.NextContinuationToken;

            if (!continuationToken) {
                isMore = false;
            }

        }
    
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



/**
 * Example usage
 */
async function main() {

    Stash.connect({
        bucket: process.env.AWS_BUCKET,
        prefix: process.env.AWS_ROOT_FOLDER,
        region: process.env.AWS_REGION,
        rootUrl: process.env.AWS_CLOUDFRONT_URL,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_SECRET,
    });


}

// Uncomment to run the example
main();

