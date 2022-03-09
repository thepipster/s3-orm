const Logger = require("../utils/logger");
const _ = require("lodash");
const Promise = require("bluebird");
const UniqueKeyViolationError = require("../errors/UniqueKeyViolationError");

class Indexing {

    constructor(id, modelName, model, engineInstance){
        this.id = id;
        this.model = model;
        this.modelName = modelName;
        this.s3 = engineInstance;
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

    // ///////////////////////////////////////////////////////////////////////////////////////

    static getIndexName(modelName, fieldName){
        return `${modelName}/indices/${fieldName}`;
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

    /**
     * Loop through the indices for this model, and reset. That is, make
     * sure they are correct and aren't corrupt
     */
    static async cleanIndices() {

        //var prof = new Profiler()
        //prof.start('_cleanIndices')
        let idList = await this.getIds();

        Logger.debug(`[${this._name()}._cleanIndices] found ${idList.length} items`);

        if (!_.isArray(idList)) {
            return;
        }

        // Get all the ids, then loop through each one and check it still exists. If not, remove
        await Promise.map(
            idList,
            async (id) => {
                //prof.start('_cleanIndices.check')
                try {
                    let exists = await this.exists(id);
                    if (!exists) {
                        Logger.warn(`[${this._name()}._cleanIndices] ${id} does not exist`);
                        await this.remove(id);
                    }
                } catch (e) {
                    Logger.error(e);
                }
                //prof.stop('_cleanIndices.check')
                return;
            },
            { concurrency: 10 }
        );

        //prof.stop('_cleanIndices')
        //prof.showResults()

        return;
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

    /**
     * Look at the expires index for any docs that need to be removed
     */
    async clearExpireIndices() {
        try {

            const unixNow = Math.round(Date.now() / 1000);
            const expiredIds = this.s3.zRange(`${this.modelName}/expires`, {
                score: true,
                gte: 0,
                lte: unixNow
            });

            //let expiredIds = await BaseModel._redisCommand("zrangebyscore", key, 0, unixNow);

            if (!expiredIds) {
                return;
            }

            //Logger.debug(`[${modelName}] EXPIRED IDS (${unixNow} = `, expiredIds)

            return Promise.map(expiredIds, async (id) => {
                try {
                    return this.constructor.remove(id);
                } catch (e) {
                    Logger.error(e);
                    return null;
                }
            });
        } catch (e) {
            Logger.error(`[${this._name()}] Error with _clearExpireIndices()`);
            Logger.error(e);
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////
}

module.exports = Indexing;
