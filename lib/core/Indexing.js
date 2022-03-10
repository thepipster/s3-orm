const Logger = require("../utils/logger");
const _ = require("lodash");
const Promise = require("bluebird");
const UniqueKeyViolationError = require("../errors/UniqueKeyViolationError");
const chalk = require('Chalk');

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
        await this.s3.del(key);  
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
        try {
            await this.s3.zSetAdd(Indexing.getIndexName(this.modelName, fieldName), val+'', this.id+'');
        }
        catch(err){
            throw new Error(`Error setting numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`);
        }
    }

    async removeNumeric(fieldName, val){
        // Stuff the id into the index as a meta value
        await this.s3.zSetRemove(Indexing.getIndexName(this.modelName, fieldName), val+'', this.id+'');
    }

    /**
     * Search on a numeric index, returning an array of id's that match the query
     * @param {string} fieldName 
     * @param {object} query gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns 
     */
    async searchNumeric(fieldName, query){
        Logger.debug(`Entering searchNumeric. Field = ${fieldName}, query = `, query);
        let res = await this.s3.zRange(Indexing.getIndexName(this.modelName, fieldName), query);
        if (!res){
            return [];
        }
        return _.map(res, (item)=>{
            return parseInt(item);
        });
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
            //Logger.error(err);
            return 0;
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async removeIndexForField(key, fieldDef, val){
        
        // If this field is not indexed, just return now
        if (!fieldDef.index){
            return;
        }

        const isNull = _.isNull(val) || _.isUndefined(val) || val == '';
        
        val = fieldDef.type.encode(val);

        /*
        Logger.info(`Removing index for ${chalk.cyan(key)};
            val ${val},
            isNull ${isNull},
            unique ${chalk.blueBright(fieldDef.unique)},
            isNumeric ${chalk.blueBright(fieldDef.type.isNumeric)},
            isInDb ${chalk.blueBright(fieldDef.isInDb)},
            index ${chalk.blueBright(fieldDef.index)},
        `);
        */

        if (isNull){
            return;
        }

        try {
            
            if (fieldDef.unique) {
                await this.removeUnique(key, val);
            }
                            
            if (fieldDef.type.isNumeric) {
                await this.removeNumeric(key, val);
            }
            else {
                await this.remove(key, val);                
            }
    
        }
        catch(err){
            Logger.error(`Error removing index for ${chalk.cyan(key)};
                val ${val},
                isNull ${isNull},
                unique ${chalk.blueBright(fieldDef.unique)},
                isNumeric ${chalk.blueBright(fieldDef.type.isNumeric)},
                isInDb ${chalk.blueBright(fieldDef.isInDb)},
                index ${chalk.blueBright(fieldDef.index)},
            `);
            Logger.error(err);
            //process.exit(1);
            throw err;
    
        }

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async setIndexForField(key, fieldDef, val, oldVal){
        
        // If this field is not indexed, just return now
        if (!fieldDef.index){
            return;
        }

        if (!this.id){
            throw new Error(`The id has not been set, can not index without it!`);
        }


        //let rawVal = val;
        let rawOldVal = oldVal;
        val = fieldDef.type.encode(val);
        oldVal = fieldDef.type.encode(oldVal);
        
        const isNull = _.isNull(val) || _.isUndefined(val) || val == '';
        const isInDb = !_.isNull(oldVal) && oldVal != '' && !_.isUndefined(oldVal);
        const isDirty = !isInDb || (val !== oldVal);

        // If it's not dirty (unchanged), then nothing to be done
        if (!isDirty){
            //Logger.info(`Skipping index for ${chalk.cyan(key)} (it's not dirty)`);
            return;
        }

        await this.removeIndexForField(key, fieldDef, rawOldVal);

        if (isNull){
            return;
        }

        /*                
        Logger.info(`Setting index for ${chalk.cyan(key)};
            val ${val},
            oldVal ${oldVal},
            unique ${chalk.blueBright(fieldDef.unique)},
            isNull ${isNull},
            isNumeric ${chalk.blueBright(fieldDef.type.isNumeric)},
            isInDb ${chalk.blueBright(fieldDef.isInDb)},
            index ${chalk.blueBright(fieldDef.index)},
        `);
        */

        if (fieldDef.unique) {
            await this.addUnique(key, val);
        }                

        if (fieldDef.type.isNumeric && !isNull) {
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
        let keys = await this.s3.listObjects(this.modelName);

        // Clean all the indexes for this  model
        await this.s3.zSetClear(this.modelName);
        await this.s3.setClear(this.modelName);

        // Get basic indexes
        let fieldNames = Object.keys(this.schema);
        let deleteBatch = [];
        
        for (let i=0; i<keys.length; i+=1){ 
            
            let key = keys[i];
            
            Logger.debug(`Deleting ${key} (${i+1} of ${keys.length})`);

            await Promise.map(fieldNames, async (fieldName) => {
                let res = await this.s3.list(Indexing.getIndexName(this.modelName, fieldName));
                for (let k=0; k<res.length; k+=1){
                    const item = res[k];
                    const dkey = `${Indexing.getIndexName(this.modelName, fieldName)}/${item}`;
                    deleteBatch.push(dkey);
                };

            }, {concurrency: 10});

        }

        await this.s3.delBatch(deleteBatch);


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
                this.id = data.id;
                this.setIndexForField(fieldName, this.schema[fieldName], data[fieldName], null)
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
