const Logger = require("./utils/logger");
const _ = require("lodash");
const Promise = require("bluebird");
const UniqueKeyViolationError = require("./errors/UniqueKeyViolationError");

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

    async removeUnique(fieldName, val){
        await this.s3.setRemove(Indexing.getIndexName(this.modelName, fieldName), val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async addUnique(fieldName, val){
        
        let alreadyExistsId = await this.s3.setIsMember(Indexing.getIndexName(this.modelName, fieldName), val);

        // Throw error if this val already exists in the set
        if (alreadyExistsId && alreadyExistsId != this.id) {
            throw new UniqueKeyViolationError(`${key} = ${val} is unique, and already exists`);
        }

        // Otherwise, this behaves like a normal index
        return this.add(fieldName, val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async remove(fieldName, val){
        // Stuff the id into the index as a meta value
        await this.s3.setRemove(Indexing.getIndexName(this.modelName, fieldName), val, this.id);
    }

    async add(fieldName, val){
        // Stuff the id into the index as a meta value
        await this.s3.setAdd(Indexing.getIndexName(this.modelName, fieldName), val, this.id);
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
            if (!_.isNumber(val)){
                return 0;
            }
            let no = parseInt(val)
            if (_.isFinite(no)){
                return no
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
        await this.s3.zSetAdd(`${this.modelName}/expires`, expires, this.id, this.id);
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
