import Logger from "../utils/Logger";
import { Stash } from "../core/Stash";
import { ModelMetaStore, type ModelSchema } from "../decorators/ModelMetaStore";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import {Promise} from "bluebird";
import {Query} from "../types";
import {isNull, isUndefined, map} from "lodash";

export class NumericIndex {

    indexRootPath: string = "s3orm/";
    schema: ModelSchema = {};
    modelName: string = "";
    rootKey?: string;
    private paddingLength: number = 10;

    constructor(modelName: string) {
        this.schema = ModelMetaStore.get(modelName);
        this.modelName = modelName;
        this.indexRootPath = Stash.rootPath + "indexes/";
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async add(id: number, colName: string, val: number, prevVal?: number): Promise<void> {
        
        /*
        // Delete old index (if there is one)
        if (prevVal != undefined && prevVal != null) {
            const oldPrefix:string = this._getPrefix(colName, prevVal);
            await Stash.aws().delete(`${oldPrefix}###${id}`);
        }

        // Add new index
        const newPrefix:string = this._getPrefix(colName, val);

        // /await Stash.s3().get(`${this.getNodeKey(colName, prevVal)}`);
        Logger.debug(`Setting index at ${newPrefix}###${id}`);

        await Stash.aws().uploadString(`${newPrefix}###${id}`, id.toString());

        */

        if (this._isNull(val)){
            return;
        }        
        const fieldDef: ColumnSchema = this._checkKey(fieldName);        
        val = fieldDef.encode(val);
        const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${EngineHelpers.encode(val)}###${this.id}`;
        await Stash.s3().set(key, val);          

    }

   // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Remove a simple index
     * @param {*} fieldName 
     * @param {*} val 
     */
    async remove(fieldName, val){
        if (this._isNull(val)){
            return;
        }       
        const fieldDef: ColumnSchema = this._checkKey(fieldName); 
        val = fieldDef.encode(val);
        const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${EngineHelpers.encode(val)}###${this.id}`;
        await Stash.s3().del(key);  
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get all the basic (string) index values for the given fieldName
     * @param {*} fieldName 
     * @returns 
     */
    async list(fieldName){                        
        const fieldDef: ColumnSchema = this._checkKey(fieldName);
        let res = await Stash.s3().list(Indexing.getIndexName(this.modelName, fieldName));
        return map(res, (item)=>{
            let parts = item.split('###');
            const decodedValue = EngineHelpers.decode(parts[0]);
            return {
                //val: this.parse(fieldName, decodedValue), 
                val: fieldDef.decode(decodedValue),
                id: parseInt(parts[1])
            }            
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Clear the entire index for the given fieldName
     * @param {*} fieldName 
     * @returns Number of items removed
     */
    async clear(fieldName){

        const fieldDef: ColumnSchema = this._checkKey(fieldName);     
        let deleteBatch = [];
        let res = await this.list(fieldName);
                
        for (let i=0; i<res.length; i+=1){             
            let item = res[i];
            let key = `${Indexing.getIndexName(this.modelName, fieldName)}/${EngineHelpers.encode(item.val)}###${item.id}`;
            deleteBatch.push(key);            
        }

        await Stash.s3().delBatch(deleteBatch);

    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    _isNull(val: number | string){
        return isNull(val) || isUndefined(val) || val == '';
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Use a padding scheme to ensure files are ordered by their numeric value
     * and can be fetched using a prefix pattern.
     * @param colName 
     * @param val 
     * @returns 
     */
    _getPrefix(colName: string, val: number): string {

        if (val == undefined || val == null) {
            throw new Error(`Value cannot be null or undefined`);
        }

        const defn = ModelMetaStore.getColumn(this.modelName, colName);

        if (defn.type !== 'float') {
            let basePrefix = `${this.indexRootPath}${this.modelName}/${colName}/`;
            return `${basePrefix}${String(val).padStart(this.paddingLength, '0')}`;    
        }
        else {
            let basePrefix = `${this.indexRootPath}${this.modelName}/${colName}/`;
            return `${basePrefix}${String(val*100).padStart(this.paddingLength, '0')}`;    
        }

        return `${modelName}/${fieldName}`;


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

    
}