import Logger from "../utils/Logger";
import { EngineHelpers } from "./EngineHelpers";
import { Storm } from "./Storm";
import { ModelMetaStore, type ColumnSchema, type ModelSchema } from "../decorators/ModelMetaStore";
import {
    isNull,
    isUndefined,
    map,
    isNumber,
    isFinite,
    uniq
} from "lodash";
import {Promise} from "bluebird";
import {Query} from "../types";
import UniqueKeyViolationError from "../errors/UniqueKeyViolationError";

class Indexing {

    id: number = 0;
    schema: ModelSchema = {};
    modelName: string = "";

    // ///////////////////////////////////////////////////////////////////////////////////////

    constructor(id, modelName){
        this.id = id;
        this.schema = ModelMetaStore.get(modelName);
        this.modelName = modelName;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    _checkKey(key: string): ColumnSchema {
        //Logger.error(key, this.schema.hasOwnProperty(key));
        //Logger.error(Object.keys(this.schema));

        if (!ModelMetaStore.hasColumn(this.modelName, key)){
            throw new Error(`The schema does not have a field called ${key}!`);            
        }

        const fieldDef: ColumnSchema = ModelMetaStore.getColumn(this.modelName, key);

        //const fieldDef: ColumnSchema = ModelMetaStore.getColumn(this.modelName, key);
        if (!fieldDef.index && !fieldDef.unique){
            throw new Error(`The schema field ${key} does not have an index!`);            
        }

        return fieldDef;
    }

    _isNull(val: number | string){
        return isNull(val) || isUndefined(val) || val == '';
    }

    //stringify(key: string, val: any){
    //    const fieldDef: ColumnSchema = this._checkKey(key);
    //    return fieldDef.encode(val);
    //}

    //parse(key: string, val: string){
    //    const fieldDef: ColumnSchema = this._checkKey(key);
    //    return fieldDef.decode(val);
    //}    

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * 
     * @param {*} fieldName 
     * @param {*} val 
     * @returns 
     */
    async isMemberUniques(fieldName, val){
        
        if (this._isNull(val)){
            throw new Error(`The value must be a string!`);
        }

        const fieldDef: ColumnSchema = this._checkKey(fieldName);                
        val = fieldDef.encode(val);

        const key = Indexing.getIndexName(this.modelName, fieldName);

        let alreadyExistsId = await Storm.s3().setIsMember(key, val);

        // Throw error if this val already exists in the set
        if (alreadyExistsId) {
            return true;
        }

        return false;

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async clearUniques(fieldName: string){
        this._checkKey(fieldName);
        return await Storm.s3().setClear(Indexing.getIndexName(this.modelName, fieldName));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async getUniques(fieldName: string){
        this._checkKey(fieldName);
        return await Storm.s3().setMembers(Indexing.getIndexName(this.modelName, fieldName));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async removeUnique(fieldName, val){
        const fieldDef: ColumnSchema = this._checkKey(fieldName);
        val = fieldDef.encode(val);
        await Storm.s3().setRemove(Indexing.getIndexName(this.modelName, fieldName), val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async addUnique(fieldName: string, val: any){

        if (val == undefined || val == null || val == ''){
            throw new Error(`Can't add an empty or null value as a unique key!`);
        }

        const fieldDef: ColumnSchema = this._checkKey(fieldName);

        val = fieldDef.encode(val); 
        const key = Indexing.getIndexName(this.modelName, fieldName);

        let alreadyExistsId = await Storm.s3().setIsMember(key, val);

        // Throw error if this val already exists in the set
        if (alreadyExistsId) {
            throw new UniqueKeyViolationError(`${fieldName} = ${val} is unique, and already exists`);
        }

        //return await this.add(fieldName, val);
        await Storm.s3().setAdd(Indexing.getIndexName(this.modelName, fieldName), val);
        return
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
        await Storm.s3().del(key);  
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Add a simple index for a value
     * @param {*} fieldName 
     * @param {*} val 
     */
    async add(fieldName, val){
        if (this._isNull(val)){
            return;
        }        
        const fieldDef: ColumnSchema = this._checkKey(fieldName);        
        val = fieldDef.encode(val);
        const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${EngineHelpers.encode(val)}###${this.id}`;
        await Storm.s3().set(key, val);  
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get all the basic (string) index values for the given fieldName
     * @param {*} fieldName 
     * @returns 
     */
    async list(fieldName){                        
        const fieldDef: ColumnSchema = this._checkKey(fieldName);
        let res = await Storm.s3().list(Indexing.getIndexName(this.modelName, fieldName));
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

        await Storm.s3().delBatch(deleteBatch);

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Perform a search on a basic (string) index
     * @param {*} fieldName 
     * @param {*} searchVal 
     * @returns 
     */
    async search(fieldName, searchVal){        
        
        const fieldDef: ColumnSchema = this._checkKey(fieldName);
        /*
        function equalsIgnoringCase(text, other) {
            if (!text){
                return false;
            }
            let test = text.localeCompare(other, undefined, { sensitivity: 'base' }) === 0;
            Logger.debug(`search() Comparing ${text} against ${other} -- match = ${test}`)

        }
        */

        searchVal = fieldDef.encode(searchVal);

        if (!searchVal || typeof searchVal != 'string'){
            Logger.warn(`Indexing.sarch() ${fieldName} = ${searchVal} is not a string`);
            return;
        }

        searchVal = searchVal.toLowerCase();
        let res = await this.list(fieldName);
        
        let list = [];

        map(res, (item)=>{
            if (item.val){
                //Logger.debug(`search() Comparing ${item.val} against ${searchVal} -- match = ${test}`)
                //if (equalsIgnoringCase(item.val, searchVal)){
                if (item.val.toLowerCase().includes(searchVal)){
                    list.push(item.id);
                }    
            }
        });

        return uniq(list);
    }          

    // ///////////////////////////////////////////////////////////////////////////////////////

    async getNumerics(fieldName){
        this._checkKey(fieldName);
        return await Storm.s3().zSetMembers(Indexing.getIndexName(this.modelName, fieldName), true);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async clearNumerics(fieldName){
        this._checkKey(fieldName);
        return await Storm.s3().zSetClear(Indexing.getIndexName(this.modelName, fieldName));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async addNumeric(fieldName, val){
        if (this._isNull(val)){
            return;
        }          
        const fieldDef: ColumnSchema = this._checkKey(fieldName);
        const numericVal = Number(val);
        if (isNaN(numericVal)) {
            throw new Error(`Invalid numeric value for field ${fieldName}: ${val}`);
        }
        try {
            await Storm.s3().zSetAdd(Indexing.getIndexName(this.modelName, fieldName), numericVal, this.id.toString());
        }
        catch(err){
            Logger.error(err);
            throw new Error(`Error setting numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`);
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async removeNumeric(fieldName: string, val: number){
        if (this._isNull(val)){
            return;
        }          
        const fieldDef: ColumnSchema = this._checkKey(fieldName);
        const numericVal = Number(val);
        if (isNaN(numericVal)) {
            throw new Error(`Invalid numeric value for field ${fieldName}: ${val}`);
        }
        try {
            await Storm.s3().zSetRemove(Indexing.getIndexName(this.modelName, fieldName), numericVal, this.id.toString());
        }
        catch(err){
            Logger.error(err.encode());
            throw new Error(`Error removing numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`);
        }        
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Search on a numeric index, returning an array of id's that match the query
     * @param {string} fieldName 
     * @param {object} query gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns 
     */
    async searchNumeric(fieldName: string, query: Query){
        this._checkKey(fieldName);
        let res = await Storm.s3().zRange(Indexing.getIndexName(this.modelName, fieldName), query);
        if (!res){
            return [];
        }
        return map(res, (item)=>{
            return item.val;
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static getIndexName(modelName: string, fieldName: string){
        return `${modelName}/${fieldName}`;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * As tracking the last id used for models is used a lot (when we create a new model instance)
     * it makes sense to cache id's as a special case
     * @param {*} modelName 
     */
    async setMaxId(id: number){
        await Storm.s3().set(`${this.modelName}/maxid`, id+'');
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async getMaxId(){
        try {
            let val = await Storm.s3().get(`${this.modelName}/maxid`);
            let no = parseInt(val)
            //Logger.debug(`getMaxId() = Read ${val}, parsed = ${no}, isNumber(no) = ${isNumber(no)}, isFinite(no) = ${isFinite(no)}`);
            if (!isNumber(no) || !isFinite(no)){
                return 0;
            }
            return no;
        }
        catch(err){
            //Logger.error(err);
            return 0;
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async removeIndexForField(key, val){
        
        const fieldDef: ColumnSchema = ModelMetaStore.getColumn(this.modelName, key);

        // If this field is not indexed, just return now
        if (!fieldDef.index && !fieldDef.unique){
            return;
        }

        const isNull = this._isNull(val);        

        
        //Logger.info(`Removing index for ${chalk.default.cyan(key)};
        //    val ${val},
        //    prevVal ${prevVal},
        //    unique ${chalk.default.blueBright(fieldDef.unique)},
        //    isNumeric ${chalk.default.blueBright(fieldDef.type.isNumeric)},
        //    isInDb ${chalk.default.blueBright(fieldDef.isInDb)},
        //    index ${chalk.default.blueBright(fieldDef.index)},
        //    id ${this.id}`);
        

        if (isNull){
            return;
        }

        try {
            
            if (fieldDef.unique) {
                await this.removeUnique(key, val);
            }
                            
            if (fieldDef.isNumeric) {
                await this.removeNumeric(key, val);
            }
            else {
                await this.remove(key, val);                
            }
    
        }
        catch(err){
            //Logger.error(`Error removing index for ${chalk.default.cyan(key)};
            //    val ${val},
            //    prevVal ${prevVal},
            //    unique ${chalk.default.blueBright(fieldDef.unique)},
            //    isNumeric ${chalk.default.blueBright(fieldDef.type.isNumeric)},
            //    isInDb ${chalk.default.blueBright(fieldDef.isInDb)},
            //    index ${chalk.default.blueBright(fieldDef.index)},
            //    id ${this.id}`);
            Logger.error(err);
            //process.exit(1);
            throw err;
    
        }

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async setIndexForField(key: string, val: any, oldVal: any){
        
        const fieldDef: ColumnSchema = ModelMetaStore.getColumn(this.modelName, key);

        // If this field is not indexed, just return now
        if (!fieldDef.index && !fieldDef.unique){
            return;
        }

        if (!this.id){
            throw new Error(`The id has not been set, can not index without it!`);
        }
        
        const isNull = this._isNull(val);
        const isInDb = !this._isNull(oldVal);
        const isDirty = !isInDb || (val !== oldVal);

        // If it's not dirty (unchanged), then nothing to be done
        if (!isDirty){
            //Logger.info(`Skipping index for ${chalk.default.cyan(key)} (it's not dirty)`);
            return;
        }

        await this.removeIndexForField(key, oldVal);

        if (isNull){
            return;
        }

        /*                
        Logger.info(`Setting index for ${chalk.default.cyan(key)};
            val ${val},
            oldVal ${oldVal},
            unique ${chalk.default.blueBright(fieldDef.unique)},
            isNull ${isNull},
            isNumeric ${chalk.default.blueBright(fieldDef.type.isNumeric)},
            isInDb ${chalk.default.blueBright(fieldDef.isInDb)},
            index ${chalk.default.blueBright(fieldDef.index)},
        `);
        */

        if (fieldDef.unique) {
            //await this.addUnique(key, val);
            // If the index is unique, and already exists, return            
            await this.addUnique(key, val);
        }                

        if (fieldDef.isNumeric && !isNull) {
            await this.addNumeric(key, val);
        }
        else {
            await this.add(key, val);
        }

  


    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Loop through the indices for this model, and reset. That is, make
     * sure they are correct and aren't corrupt
     */
    async cleanIndices() {

        // List all objects from their hashes
        let keys = await Storm.s3().listObjects(this.modelName);

        // Clean all the indexes for this  model
        await Storm.s3().zSetClear(this.modelName);
        await Storm.s3().setClear(this.modelName);

        // Get basic indexes
        let fieldNames = Object.keys(this.schema);
        let deleteBatch = [];
        
        for (let i=0; i<keys.length; i+=1){ 
            
            let key = keys[i];
            
            //Logger.debug(`Deleting ${key} (${i+1} of ${keys.length})`);

            await Promise.map(fieldNames, async (fieldName) => {
                let res = await Storm.s3().list(Indexing.getIndexName(this.modelName, fieldName));
                for (let k=0; k<res.length; k+=1){
                    const item = res[k];
                    const dkey = `${Indexing.getIndexName(this.modelName, fieldName)}/${item}`;
                    deleteBatch.push(dkey);
                }
            }, {concurrency: 10});

        }

        await Storm.s3().delBatch(deleteBatch);


        // TODO: Explore, to make faster...
        // Storm.s3().aws.deleteAll(items);
        let maxId = -9999;

        await Promise.map(keys, async (key) => {                    
            
            let data = await Storm.s3().getObject(key);
            
            if (data.id > maxId){
                maxId = data.id;
            }

            // Set new indexes
            for (let j=0; j<fieldNames.length; j+=1){
                let fieldName = fieldNames[j];
                this.id = data.id;
                this.setIndexForField(fieldName, this.schema[fieldName], data[fieldName])
            }

        }, {concurrency: 10}); 

        // Set max id correctly
        await this.setMaxId(maxId);

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Add a expire index, that will expire the entire model instance
     * @param {integer} expireTime Seconds in the future that this will expire
     */
     async addExpires(expireTime: number){
        let expires = Math.round(Date.now() / 1000) + expireTime;
        await Storm.s3().zSetAdd(`${this.modelName}/expires`, expires, this.id+'', this.id+'');
    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////
}
export default Indexing;
