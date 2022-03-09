const Logger = require("../utils/logger");
const _ = require("lodash");
const Promise = require("bluebird");
const UniqueKeyViolationError = require("../errors/UniqueKeyViolationError");

class Indexing {

    constructor(id, modelName, schema, s3Engine){
        this.id = id;
        this.schema = schema;
        this.modelName = modelName;
        this.s3 = s3Engine;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async isUnique(fieldName, val){
        return await this.s3.setIsMember(Indexing.getIndexName(this.modelName, fieldName), val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async clearUniques(fieldName){
        return await this.s3.setClear(Indexing.getIndexName(this.modelName, fieldName));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async getUniques(fieldName){
        return await this.s3.setMembers(Indexing.getIndexName(this.modelName, fieldName));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async removeUnique(fieldName, val){
        await this.s3.setRemove(Indexing.getIndexName(this.modelName, fieldName), val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async addUnique(fieldName, val){

        if (typeof val != 'string'){
            throw new Error(`Can't add an empty non-string value!`);
        }

        let alreadyExistsId = await this.s3.setIsMember(Indexing.getIndexName(this.modelName, fieldName), val);

        // Throw error if this val already exists in the set
        if (alreadyExistsId && alreadyExistsId != this.id) {
            throw new UniqueKeyViolationError(`${fieldName} = ${val} is unique, and already exists`);
        }

        //Logger.debug(`Adding unique: ${val}`, Indexing.getIndexName(this.modelName, fieldName));

        // Otherwise, this behaves like a normal index
        return this.add(fieldName, val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Remove a simple index
     * @param {*} fieldName 
     * @param {*} val 
     */
    async remove(fieldName, val){
        const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${this.s3._encode(val)}###${this.id}`;
        await this.s3.remove(key);  
        //this.s3.setRemove(`${Indexing.getIndexName(this.modelName, fieldName)}/${val}###${this.id}`, this.id, val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Add a simple index for a value
     * @param {*} fieldName 
     * @param {*} val 
     */
    async add(fieldName, val){
        //Logger.debug(`Adding ${fieldName} with val = ${val}`)
        const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${this.s3._encode(val)}###${this.id}`;
        await this.s3.set(key, val);  
        //await this.s3.setAdd(`${Indexing.getIndexName(this.modelName, fieldName)}/${this.id}###${val}`);            
    }

    // ///////////////////////////////////////////////////////////////////////////////////////
/*

    async getIds(setName){        
        let res = await this.aws.list(this.__getPath('sets', setName));
        let list = _.map(res, (item)=>{
            let fname = item.Key.split('/').pop();
            let parts = fname.split('###');
            return parseInt(parts[1]);
        });
        return _.uniq(list);
    }    

    async getVals(setName){        
        let res = await this.aws.list(this.__getPath('sets', setName));
        let list = _.map(res, (item)=>{
            let fname = item.Key.split('/').pop();
            let parts = fname.split('###');
            return this._decode(parts[0]);
        });
        return _.uniq(list);
    }    
    */

    /**
     * Get all the basic (string) index values for the given fieldName
     * @param {*} fieldName 
     * @returns 
     */
    async get(fieldName){                        
        let res = await this.s3.list(Indexing.getIndexName(this.modelName, fieldName));
        return _.map(res, (item)=>{
            let parts = item.split('###');
            return {
                val: this.s3._decode(parts[0]), 
                id: parseInt(parts[1])
            }            
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Perform a search on a basic (string) index
     * @param {*} fieldName 
     * @param {*} searchVal 
     * @returns 
     */
    async search(fieldName, searchVal){        
        
        /*
        function equalsIgnoringCase(text, other) {
            if (!text){
                return false;
            }
            let test = text.localeCompare(other, undefined, { sensitivity: 'base' }) === 0;
            Logger.debug(`search() Comparing ${text} against ${other} -- match = ${test}`)

        }
        */

        if (!searchVal || typeof searchVal != 'string'){
            Logger.warn(`Indexing.sarch() ${fieldName} = ${searchVal} is not a string`);
            return;
        }

        searchVal = searchVal.toLowerCase();
        let res = await this.get(fieldName);
        
        let list = [];

        _.map(res, (item)=>{
            if (item.val){
                //Logger.debug(`search() Comparing ${item.val} against ${searchVal} -- match = ${test}`)
                //if (equalsIgnoringCase(item.val, searchVal)){
                if (item.val.toLowerCase().includes(searchVal)){
                    list.push(item.id);
                }    
            }
        });

        return _.uniq(list);
    }          

    // ///////////////////////////////////////////////////////////////////////////////////////

    async addNumeric(fieldName, val){
        // Stuff the id into the index as a meta value
        await this.s3.zSetAdd(Indexing.getIndexName(this.modelName, fieldName), val, this.id);
    }

    async removeNumeric(fieldName, val){
        // Stuff the id into the index as a meta value
        await this.s3.zSetRemove(Indexing.getIndexName(this.modelName, fieldName), val, this.id);
    }

    async searchNumeric(fieldName, opts){
        // '$gte': 12
        let res = await this.s3.zRange(Indexing.getIndexName(this.modelName, fieldName), opts);
        Logger.debug('searchNumeric, res = ', res);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static getIndexName(modelName, fieldName){
        return `${modelName}/${fieldName}`;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * As tracking the last id used for models is used a lot (when we create a new model instance)
     * it makes sense to cache id's as a special case
     * @param {*} modelName 
     */
    async setMaxId(id){
        await this.s3.set(`${this.modelName}/maxid`, id+'');
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async getMaxId(){
        try {
            let val = await this.s3.get(`${this.modelName}/maxid`);
            let no = parseInt(val)
            //Logger.debug(`getMaxId() = Read ${val}, parsed = ${no}, _.isNumber(no) = ${_.isNumber(no)}, _.isFinite(no) = ${_.isFinite(no)}`);
            if (!_.isNumber(no) || !_.isFinite(no)){
                return 0;
            }
            return no;
        }
        catch(err){
            Logger.error(err);
            return 0;
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async setIndexForField(fieldDef, val, oldVal){
        
        if (fieldDef.unique) {
            if (isInDb){
                await indx.removeUnique(key, oldVal);
            }
            if (!isNull){
                await indx.addUnique(key, val);
            }
        }

        // set new normal index
        if (fieldDef.index) {
            
            if (fieldDef.isNumeric && !isNull) {
                // we use scored sets for things like "get all users older than 5"
                await this.s3.zSetAdd(key, val, data.id);
            }

            // Remove old index
            if (isInDb) {
                await indx.remove(key, oldVal);
            }

            if (!isNull){
                await indx.add(key, val);
            }
        }        
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Loop through the indices for this model, and reset. That is, make
     * sure they are correct and aren't corrupt
     */
    async cleanIndices() {

        // List all objects from their hashes
        let keys = await this.s3.listObjects(this.modelName);

        // Clean all the indexes for this  model
        await this.s3.zSetClear(this.modelName);
        await this.s3.setClear(this.modelName);

        // Get basic indexes
        let fieldNames = Object.keys(this.schema);
        
        for (let i=0; i<keys.length; i+=1){ 
            
            let key = keys[i];
            
            Logger.debug(`Deleting ${key} (${i+1} of ${keys.length})`);

            for (let j=0; j<fieldNames.length; j+=1){
                let fieldName = fieldNames[j];
                let res = await this.s3.list(Indexing.getIndexName(this.modelName, fieldName));
                await Promise.map(res, async (item) => {     
                    const dkey = `${Indexing.getIndexName(this.modelName, fieldName)}/${item}`;
                    await this.s3.del(dkey);
                });
            }

        }

        // TODO: Explore, to make faster...
        // this.s3.aws.deleteAll(items);
        let maxId = -9999;

        await Promise.map(keys, async (key) => {                    
            
            let data = await this.s3.getObject(key);
            
            if (data.id > maxId){
                maxId = data.id;
            }

            // Set new indexes
            for (let j=0; j<fieldNames.length; j+=1){
                let fieldName = fieldNames[j];
                let fieldDef = (this.schema[fieldName].type) ? this.schema[fieldName].type : this.schema[fieldName];
                this.setIndexForField(fieldDef, data[fieldName], null)
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
     async addExpires(expireTime){
        let expires = Math.round(Date.now() / 1000) + expireTime;
        await this.s3.zSetAdd(`${this.modelName}/expires`, expires+'', this.id+'', this.id+'');
    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////
}

module.exports = Indexing;
