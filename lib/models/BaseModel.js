require('dotenv-safe').config({});
const Logger = require("../utils/logger");
const _ = require("lodash");
const Promise = require("bluebird");
const BaseModelHelper = require("../types");
const uuidv4 = require("uuid/v4");
const UniqueKeyViolationError = require("../errors/UniqueKeyViolationError");
const QueryError = require("../errors/QueryError");
const Indexing = require("../core/Indexing.js");
const chalk = require('Chalk');

/**
 * Base Redis models, based on Nohm (https://maritz.github.io/nohm/)
 */
class BaseModel {
    
    /**
     * Base constructor. The model should be like;
     *
     *  [
     *      id: {type:'number', index:true},
     *      noUsersInGame: {type:'number', defaultValue:0},
     *      noUsers: {type:'number', defaultValue:0},
     *      isStarted: {type:'number', defaultValue: 0},
     *      startTime: {type: 'date', defaultValue: ()=>{return Date.now()}}
     *      currentQuestionId: {type:'number', defaultValue: 0},
     *      questionIds: {type:'array', default: []}
     *  ]
     *
     * @param {object} data The initial data, e.g. {id:0}
     * @param {object} prefix The prefix, e.g. 'game:'
     * @param {object} model The model
     */
    constructor(data) {

        if (!data){
            data = {};
        }

        // Grab model and prefix from the child static methods
        // NOTE: static methods are just methods on the class constructor
        const model = this.constructor._schema();
        //this.s3 = this.constructor.s3;
        
        if (model) {
            for (let key in model) {

                var item = model[key];
                let defn = (model[key].type) ? model[key].type : model[key];

                try {
                    
                    if (!_.isUndefined(data[key])) {
                        //this[key] = data[key];
                        this[key] = data[key];
                        //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                    } 
                    else if (!_.isUndefined(item.defaultValue)) {
                        if (typeof item.defaultValue == "function") {
                            this[key] = item.defaultValue();
                        } 
                        else {
                            this[key] = item.defaultValue;
                        }
                    } 
                    else if (!_.isUndefined(item.default)) {
                        this[key] = item.default;
                    } 
                    else {
                        //Logger.error(`${key} is not defined: ${data[key]}`)
                        this[key] = null;
                    }
    
                    //Logger.info(`${chalk.cyan(key)} of type ${chalk.blueBright(defn.name)} = ${chalk.green(data[key])} (${typeof data[key]})`);
    
                }
                catch(err){
                    Logger.error(item, data[key]);
                    Logger.error(`Error setting data in constructor`, err.toString());
                    process.exit(1);
                }

            }

            if (data.id) {
                this.id = data.id;
            }
        }

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    toJson(){
        
        var model = this.constructor._schema();
        let item = {};

        for (var key in model) {
            if (key in this && typeof this[key] != "undefined") {
                item[key] = this[key];
            }
        }

        return item;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Utility method to generate a new UUID
     */
    static getUUID() {
        return uuidv4();
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async all(){

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async resetIndex(){
        const modelName = this._name();
        const model = this._schema();        
        const indx = new Indexing(null, modelName, model, this.s3);
        await indx.cleanIndices();
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Return true if a model exists with this id
     * @param {string} id
     */
    static async exists(id) {
        return await this.s3.hasObject(`${modelName}/${id}`);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async max(fieldName){
        const model = this._schema();
        const type = (model[fieldName].type) ? model[fieldName].type : model[fieldName];
        const modelName = this._name();        
        if (!type.isNumeric){
            throw new QueryError(`${modelName}.${fieldName} is not numeric!`);
        }
        return await this.s3.zGetMax(`${modelName}/${fieldName}`, false);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async count(query) {
        let docIds = await this.getIds(query);
        return docIds.length;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async distinct(field, query) {
        // TODO: speed up. This is slow as it requires loading
        // all docs then extracting the required field...
        let docs = await this.find(query);
        return _.uniq(_.map(docs, field));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////
    
    /**
     * Delete this document from redis, and clear it out from any indices
     */
    async remove() {
        //Logger.info(`Removing ${this.id}`)

        if (!this.id) {
            throw new Error(`Trying to remove document without an id!`);
        }

        const s3 = this.constructor.s3;
        const modelName = this.constructor._name();
        const model = this.constructor._schema();
        const indx = new Indexing(this.id, modelName, model, s3);


        for (let key in model) {
            Logger.debug(`${chalk.green(modelName)}] deleting ${chalk.yellow(key)}, val = ${this[key]}`);
            await indx.removeIndexForField(key, model[key], this[key]);
            //await s3.delObject(`${modelName}/${this.id}`, this);
        }
        


            /*
        // Remove data

        await s3.del(BaseModelHelper.getKey(modelName, "hash", this.id));

        // Remove from the idset, which is an index that contains all id's for this model
        //Logger.debug(`Removing ${this.id} from idsets set ${BaseModelHelper.getKey(modelName, 'idsets')}`)
        await s3.setRemove(`indices/${modelName}/id`, this.id);

        // Remove from the expires index, if there
        //Logger.debug(`Removing ${this.id} from expires set ${BaseModelHelper.getKey(modelName, 'expire')}`)
        await s3.zSetRemove(`indices/${modelName}/expire`, this.id);

        for (let field in model) {
            let val = this[field];

            if (model[field].index) {
                let key = `${BaseModelHelper.getKey(modelName, "index")}:${field}:${val}`;
                //Logger.debug(`Removing ${this.id} from 'index' ${key}`)
                await s3.setRemove(key, this.id);
            }

            if (model[field].unique) {
                let key = `${BaseModelHelper.getKey(modelName, "unique")}:${field}:${val}`;
                //Logger.debug(`Removing ${this.id} from 'unique' ${key}`)
                await s3.del(key, this.id);
            }

            if (BaseModelHelper.isNumericType(model[field].type)) {
                let key = `${BaseModelHelper.getKey(modelName, "scoredindex")}:${field}`;
                //Logger.debug(`Removing ${this.id} from 'scoredindex' ${key}`)
                await s3.zSetRemove(key, this.id);
            }
        }

        return;
        */
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Delete a document from redis, and clear it out from any indices
     * @param {string} id The id of the document to delete
     */
    static async remove(id) {
        //Logger.info(`Removing ${id}`)

        if (!id) {
            throw new Error(`Trying to remove document without an id!`);
        }

        let doc = await this.loadFromId(id);

        if (doc) {
            await doc.remove();
        }

        return;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async save() {

        const modelName = this.constructor._name();
        const opts = this.constructor._opts();
        const model = this.constructor._schema();        
        const s3 = this.constructor.s3;
        const indx = new Indexing(this.id, modelName, model, s3);
        var oldValues = {};

        if (this.id){
            try {
                oldValues = await this.constructor.loadFromId(this.id);
            }
            catch(err){
            }
            if (!oldValues){
                oldValues = {};
            }
        }
        else {
            // We need to set the id! So get the highest id in use for this model
            let maxId = await indx.getMaxId();
            this.id = maxId + 1;
            await indx.setMaxId(this.id);
        }
    
        //Logger.debug(`Saving ${modelName} ${this.id}`)

        var keys = [];

        for (var key in model) {
            if (key in this && typeof this[key] != "undefined") {
                keys.push(key);
            }
        }  

        await Promise.map(keys, async (key)=>{

            var val = this[key];
            const defn = model[key].type ? model[key].type : model[key];

            try {
    
                //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${val}`);
    
                // Check if this key is unique and already exists (if so, throw an error)
                if (defn.unique) {
                    
                    let alreadyExistsId = await indx.isUnique(key, val);
    
                    //Logger.warn(`${key} (${keyUnique}) val = ${val}, exists? ${alreadyExistsId}`)
    
                    if (alreadyExistsId && alreadyExistsId != this.id) {
                        throw new UniqueKeyViolationError(`${key} = ${val} is unique, and already exists`);
                    }
                }
    
                
                //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}]data[key] = ${data[key]}`);
    
                /*
                if (typeof defn.onUpdateOverride == "function") {
                    data[key] = BaseModelHelper.writeItem(defn, defn.onUpdateOverride());
                } else {
                    data[key] = BaseModelHelper.writeItem(defn, val);
                }
                */ 
            } 
            catch (err) {
                Logger.error(`Error setting up data for ${chalk.blue(modelName)}.${chalk.cyan(key)};
                    val ${val},
                    unique ${chalk.blueBright(defn.unique)},
                    isNumeric ${chalk.blueBright(defn.isNumeric)}
                `);
                Logger.error(err.toString());
                process.exit(1);
            }

                         

        });

        //
        // Write data to S3
        //

        // Call the encode function of each DataType to make sure it's in a form that can be written to the DB (S3)
        let dbSafe = {};
        for (let i=0; i<keys.length; i+=1){
            let key = keys[i];
            const defn = model[key].type ? model[key].type : model[key];
            dbSafe[key] = defn.encode(this[key]);
        }

        //Logger.debug(`[${chalk.greenBright(modelName)}] Saving object ${this.id} to ${modelName}/${this.id}`);
        await s3.setObject(`${modelName}/${this.id}`, dbSafe);

        //
        // Setup indexes...
        //

        // Update the index with the id (which it needs to set the correct path for indexes!)
        indx.id = this.id;

        //Logger.debug(`[${chalk.greenBright(modelName)}] Setting up indexes for instance ${this.id}`);
    
        await Promise.map(keys, async (key)=>{
            
            try {
                //Logger.debug(`[${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${this[key]}, prevVal = ${oldValues[key]}`);
                await indx.setIndexForField(key, model[key], this[key], oldValues[key]);
            } 
            catch (err) {
                if (err instanceof UniqueKeyViolationError) {
                    // Let this error bubble up, don't catch here
                    //Logger.error('UniqueKeyViolationError error')
                    throw err;
                }
                Logger.error('key = ', key);
                Logger.error('data = ', this);
                Logger.error('oldValues = ', oldValues);
                Logger.error(err.toString());
                process.exit(1);
            }


        }, {concurrency:1});

        //Logger.debug(`[${chalk.greenBright(modelName)}] done setting indexes`);

        // If this item expires, add to the expires index
        if (opts && opts.expires) {  
            //Logger.debug(`[${chalk.greenBright(modelName)}] Setting expires`);
            await indx.addExpires(opts.expires);
        }

        // Finally, expire anything that needs
        // TODO: test expires
        //await indx.clearExpireIndices();

        return this;


    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Parse raw data from S3, i.e. data given by a call to s3.getObject
     * @param {*} rawData 
     * @returns 
     */
    static __parseObjectFromS3(rawData){

        const model = this._schema();
        var data = {};

        for (let key in model) {
            data[key] = (model[key].type) ? model[key].type.parse(rawData[key]) : model[key].parse(rawData[key]);            
        }

        return data;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async loadFromId(id) {
        try {

            const model = this._schema();
            const modelName = this._name();
            const key = `${modelName}/${id}`;
            const rawData = await this.s3.getObject(key);

            if (!rawData) {
                throw new Error(`Could not load ${modelName} with id of ${id}`);
            }

            const data = this.__parseObjectFromS3(rawData);
            let doc = new this(data);
            return doc;

        } catch (err) {
            Logger.error(`[${this._name()}] Error with loadFromId(), id = ${id}`);
            //Logger.error(err);
            return null;
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async findOne(query = {}) {
        try {
            let docIds = await this.getIds(query);

            if (docIds.length == 0) {
                return null;
            }

            return await this.loadFromId(docIds[0]);
        } catch (err) {
            Logger.error(`[${this._name()}] Error with findOne(), query = `, query);
            Logger.error(err);
            return [];
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Perform a query. Supports simple and compound queries, plus ranges and limits;
     * For example, a range;
     *
     *      aFloat: {
     *           min: 15.0,
     *           max: 22.0
     *       }
     *
     * A range with a limit;
     *
     *       aFloat: {
     *           min: 15.0,
     *           max: 22.0,
     *           limit: 1,
     *           offset: 1
     *       }
     *
     * @param {*} query The query, e.g. {name:'fred'} or {name:'fred', age:25}. Note that
     * query keys must be indexed fields in the schema.
     */
    static async find(query = {}) {
        try {
            let docIds = await this.getIds(query);

            if (docIds.length == 0) {
                return [];
            }

            return await Promise.map(docIds, async (docId) => {
                try {
                    return await this.loadFromId(docId);
                } catch (e) {
                    return null;
                }
            });
        } catch (err) {
            Logger.error(`[${this._name()}] Error with find(), query = `, query);
            Logger.error(err);
            return [];
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async getIds(query = {}) {
        
        const modelName = this._name();
        const model = this._schema();
        const structuredSearches = this._createStructuredSearchOptions(query);
        const indx = new Indexing(null, modelName, model, this.s3);

        // Get results from basic index searches
        var results = [];
        await Promise.map(structuredSearches, async (qry) => {
            if (qry.type == 'zset'){
                results.push(await indx.searchNumeric(qry.key, qry.value));
            }
            else if (qry.type == 'set'){
                results.push(await indx.search(qry.key, qry.value));
            }
            else if (qry.type == 'unique'){
                results.push(await indx.search(qry.key, qry.value));
            }
        
        });

        let inter = _.intersection(...results);
        Logger.debug(results);
        Logger.info(inter);

        return inter;

    }

    // ///////////////////////////////////////////////////////////////////////////////////////
    
    static _createStructuredSearchOptions(query) {
        
        let model = this._schema();

        return Object.keys(query).map((key) => {
            
            const search = query[key];

            const definition = model[key];
            const isNumeric = (definition.type) ? definition.type.isNumeric : definition.isNumeric;

            //Logger.info('definition - ', definition);

            if (!definition) {
                throw new Error(`No definition for ${this._name()} ${key}`);
            }

            var structuredSearch = {
                key,
                options: {},
                type: "undefined",
                value: search,
            };

            if (!isNumeric && !definition.index) {
                throw new Error(`Trying to search for non-indexed and non-unique property '${key}' is not supported.`);
            }

            const isDirectNumericSearch = !isNaN(parseInt(search, 10));
            const isSimpleIndexSearch = !isNumeric || isDirectNumericSearch;

           // Logger.debug(`isNumeric = ${isNumeric}, isSimpleIndexSearch = ${isSimpleIndexSearch}, isDirectNumericSearch = ${isDirectNumericSearch}`);

            if (!isSimpleIndexSearch && isNumeric) {
                structuredSearch.type = "zset";
                structuredSearch.options = search;
            } 
            else if (definition.index === true) {
                structuredSearch.type = "set";
            }

            //Logger.debug('structuredSearch = ', structuredSearch);

            return structuredSearch;
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Generate a token for use as a secret key, nonce etc.
     * @param length (optional) specify length, defaults to 24;
     * @return {string}
     */
    static generateToken(length = 24) {
        return BaseModelHelper.generateToken(length);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Generate random sample data for this class
     */
    static generateMock() {

        const model = this._schema();        

        let mocked = new this();

        for (var key in model) {
            //keys.push(key);
            //Logger.warn(model[key].type);
            if (model[key].type){
                mocked[key] = model[key].type.mock();
            }
            else if (model[key].mock){
                mocked[key] = model[key].mock();
            }
        }  

        return mocked;

    }


}

module.exports = BaseModel;
