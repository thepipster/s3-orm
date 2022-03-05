require('dotenv-safe').config({});
const Logger = require("../utils/logger");
const _ = require("lodash");
const Promise = require("bluebird");
const BaseModelHelper = require("../core/DataTypes");
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
        var model = this.constructor._model();
        this.s3 = this.constructor.s3;
        
        if (model) {
            for (let key in model) {
                var item = model[key];

                if (!_.isUndefined(data[key])) {
                    this[key] = data[key];
                    //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                } else if (!_.isUndefined(item.defaultValue)) {
                    if (typeof item.defaultValue == "function") {
                        this[key] = item.defaultValue();
                    } else {
                        this[key] = item.defaultValue;
                    }
                } else if (!_.isUndefined(item.default)) {
                    this[key] = item.default;
                } else {
                    //Logger.error(`${key} is not defined: ${data[key]}`)
                    this[key] = null;
                }
            }

            if (data.id) {
                this.id = data.id;
            }
        }

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    toJson(){
        
        var model = this.constructor._model();
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

    /**
     * Return true if a model exists with this id
     * @param {string} id
     */
    static async exists(id) {
        return await this.s3.hasObject(`${modelName}/${id}`);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async max(fieldName){
        const model = this._model();
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

        var modelName = this.constructor._name();
        var model = this.constructor._model();

        // Remove hash model
        await this.s3.del(BaseModelHelper.getKey(modelName, "hash", this.id));

        // Remove from the idset, which is an index that contains all id's for this model
        //Logger.debug(`Removing ${this.id} from idsets set ${BaseModelHelper.getKey(modelName, 'idsets')}`)
        await this.s3.setRemove(`indices/${modelName}/id`, this.id);

        // Remove from the expires index, if there
        //Logger.debug(`Removing ${this.id} from expires set ${BaseModelHelper.getKey(modelName, 'expire')}`)
        await this.s3.zSetRemove(`indices/${modelName}/expire`, this.id);

        for (let field in model) {
            let val = this[field];

            if (model[field].index) {
                let key = `${BaseModelHelper.getKey(modelName, "index")}:${field}:${val}`;
                //Logger.debug(`Removing ${this.id} from 'index' ${key}`)
                await this.s3.setRemove(key, this.id);
            }

            if (model[field].unique) {
                let key = `${BaseModelHelper.getKey(modelName, "unique")}:${field}:${val}`;
                //Logger.debug(`Removing ${this.id} from 'unique' ${key}`)
                await this.s3.del(key, this.id);
            }

            if (BaseModelHelper.isNumericType(model[field].type)) {
                let key = `${BaseModelHelper.getKey(modelName, "scoredindex")}:${field}`;
                //Logger.debug(`Removing ${this.id} from 'scoredindex' ${key}`)
                await this.s3.zSetRemove(key, this.id);
            }
        }

        return;
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
        const model = this.constructor._model();        
        const indx = new Indexing(this.id, modelName, model, this.s3);
        var data = {};        
        var oldValues = {};

        if (this.id){
            oldValues = await this.constructor.loadFromId(this.id);
            throw new Error(`Could load ${modelName} with id of ${this.id}`);
        }
        else {
            // We need to set the id! So get the highest id in use for this model
            let maxId = await indx.getMaxId();
            Logger.debug(`max id = ${maxId}`);
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

        data.id = this.id;


            await Promise.map(keys, async (key)=>{

                var val = this[key];
                const definition = model[key].type ? model[key].type : model[key];

                //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${val}`);

                // Check if this key is unique and already exists (if so, throw an error)
                if (definition.unique) {
                    
                    let alreadyExistsId = await indx.isUnique(key, val);

                    //Logger.warn(`${key} (${keyUnique}) val = ${val}, exists? ${alreadyExistsId}`)

                    if (alreadyExistsId && alreadyExistsId != this.id) {
                        throw new UniqueKeyViolationError(`${key} = ${val} is unique, and already exists`);
                    }
                }

                // Call the encode function of each DataType to make sure it's in a form
                // that can be written to the DB (S3)
                data[key] = definition.encode(val);
                
                //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}]data[key] = ${data[key]}`);

                /*
                if (typeof definition.onUpdateOverride == "function") {
                    data[key] = BaseModelHelper.writeItem(definition, definition.onUpdateOverride());
                } else {
                    data[key] = BaseModelHelper.writeItem(definition, val);
                }
                */                          

            });

            // Write data to S3
            //data.id = this.id+'';
            Logger.debug(`[${chalk.greenBright(modelName)}] Saving object ${data.id} to ${modelName}/${data.id}`);
            await this.s3.setObject(`${modelName}/${data.id}`, data);

            //
            // Setup indexes...
            //

            Logger.debug(`[${chalk.greenBright(modelName)}] Setting up indexes....`);

        
            await Promise.map(keys, async (key)=>{

                var val = data[key];
                var oldVal = oldValues[key];
                const definition = model[key];
                const isNull = _.isNull(val) || val == '';
                const isInDb = !_.isNull(oldVal) && oldVal != '' && !_.isUndefined(oldVal);
                const isDirty = !isInDb || (val !== oldVal);

                try {
                    if (isDirty){

                        if (definition.unique) {
                            if (isInDb){
                                await indx.removeUnique(key, oldVal);
                            }
                            if (!isNull){
                                await indx.addUnique(key, val);
                            }
                        }
    
                        // set new normal index
                        if (definition.index) {
                            
                            if (definition.isNumeric && !isNull) {
                                // we use scored sets for things like "get all users older than 5"
                                await this.s3.zSetAdd(key, val, data.id);
                            }
    
                            // Remove old index
                            if (isInDb) {
                                //if (key == 'aBoolean'){
                                    Logger.debug(`[${chalk.green(modelName)}.${chalk.yellow(key)}] Adding numeric index; newValue: '${val}'; oldVal: '${oldVal}' (${typeof oldVAl}).`)
                                // }
                                await indx.remove(key, oldVal);
                            }
    
                            if (!isNull){
                                await indx.add(key, val);
                            }
                        }
    
                    }            
                } 
                catch (err) {
                    if (err instanceof UniqueKeyViolationError) {
                        // Let this error bubble up, don't catch here
                        //Logger.error('UniqueKeyViolationError error')
                        throw err;
                    }
                    Logger.error(`[${chalk.green(modelName)}.${chalk.yellow(key)}] Error setting index. 
                        isDirty = ${isDirty}, val = ${val}, oldVal = ${oldVal}, isNull =  ${isNull}, isInDb = ${isInDb}`);
                    Logger.error(err.toString());
                    process.exit(1);
                }


            });

            Logger.debug(`[${chalk.greenBright(modelName)}] done setting indexes`);

            // If this item expires, add to the expires index
            if (opts && opts.expires) {  
                Logger.debug(`[${chalk.greenBright(modelName)}] Setting expires`);
                await indx.addExpires(opts.expires);
            }

            // Finally, expire anything that needs
            // TODO: test expires
            //await indx.clearExpireIndices();

            return this;


    }


    // ///////////////////////////////////////////////////////////////////////////////////////

    static async loadFromId(id) {
        try {

            const model = this._model();
            const modelName = this._name();
            const data = await this.s3.getObject(`${modelName}/${id}`);

            if (!data) {
                throw new Error(`${modelName} with id of ${id} not found`);
            }

            let doc = new this();

            for (let key in model) {
                //Logger.info(`[${key}, ${model[key].type}] ${doc[key]} : ${data[key]}`)
                if (key in data) {
                    doc[key] = model[key].type.decode(data[key]);                    
                }
            }

            doc.id = data.id;

            return doc;
        } catch (err) {
            Logger.error(`[${this._name()}] Error with loadFromId(), id = ${id}`);
            Logger.error(err);
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
        const structuredSearches = this._createStructuredSearchOptions(query);

        const uniqueSearch = structuredSearches.find((search) => search.type === "unique");

        if (uniqueSearch) {
            //Logger.debug(`Finding '${modelName}'s with uniques:`, uniqueSearch);
            let ids = await this._uniqueSearch(uniqueSearch);
            return ids ? ids : [];
        }

        const onlySets = structuredSearches.filter((search) => search.type === "set");
        const onlyZSets = structuredSearches.filter((search) => search.type === "zset");

        //Logger.debug('onlySets = ', onlySets)
        //Logger.debug('onlyZSets = ', onlyZSets)

        if (onlySets.length === 0 && onlyZSets.length === 0) {
            // no valid searches - return all ids
            let key = BaseModelHelper.getKey(modelName, "idsets");
            let ids = await BaseModel._redisCommand("smembers", key);
            return ids ? ids : [];
        }

        //Logger.debug(`Finding '${modelName}'s with these searches (sets, zsets):`, onlySets, onlyZSets);

        const setPromises = this._setSearch(onlySets);
        const zSetPromises = this._zSetSearch(onlyZSets);
        const searchResults = await Promise.all([setPromises, zSetPromises]);

        //Logger.info('searchResults = ', searchResults)

        if (onlySets.length !== 0 && onlyZSets.length !== 0) {
            // both searches - form intersection of them
            const intersection = _.intersection(searchResults[0], searchResults[1]);
            return intersection ? intersection : [];
        } else {
            // only one form of search
            if (onlySets.length !== 0) {
                return searchResults[0] ? searchResults[0] : [];
            } else {
                return searchResults[1] ? searchResults[1] : [];
            }
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////
    
    static _createStructuredSearchOptions(query) {
        let model = this._model();

        return Object.keys(query).map((key) => {
            const search = query[key];

            const definition = model[key];

            if (!definition) {
                throw new Error(`No definition for ${this._name()} ${key}`);
            }

            const isNumeric = definition.isNumeric;

            const structuredSearch = {
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

            if (!isSimpleIndexSearch && isNumeric) {
                structuredSearch.type = "zset";
                structuredSearch.options = search;
            } else if (definition.index === true) {
                structuredSearch.type = "set";
            }

            return structuredSearch;
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async _uniqueSearch(options) {
        const modelName = this._name();
        const model = this._model();
        let val = BaseModelHelper.writeItem(model[search.key], search.value);
        const key = `${BaseModelHelper.getKey(modelName, "unique")}:${options.key}:${val}`;
        const id = await BaseModel._redisCommand("get", key);
        if (id) {
            return [id];
        } else {
            return [];
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async _setSearch(searches) {
        const modelName = this._name();
        const model = this._model();

        const keys = searches.map((search) => {
            let val = BaseModelHelper.writeItem(model[search.key], search.value);
            return `${BaseModelHelper.getKey(modelName, "index")}:${search.key}:${val}`;
        });

        if (keys.length === 0) {
            // shortcut
            return [];
        }

        //Logger.warn('_setSearch', keys)
        return BaseModel._redisCommand("sinter", keys);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async _zSetSearch(searches) {
        const singleSearches = await Promise.all(searches.map((search) => this._singleZSetSearch(search)));
        return _.intersection(...singleSearches);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Numeric indexes are created for all properties that have index set to true and are of the type ‘integer’, ‘float’ or
     * ‘timestamp’. The search needs to be an object that optionaly contains further filters: min, max, offset and limit.
     * This uses the redis command zrangebyscore and the filters are the same as the arguments passed to that command. (limit = count)
     * They default to this:
     *
     * {
     *   $gte: '-inf',
     *   $lte: '+inf',
     *   offset: '+inf', // only used if a limit is defined
     *   limit: undefined
     *}
     *
     * To specify an infinite limit while using an offset use limit: 0.
     *
     * const ids = await SomeModel.find({
     *   someInteger: {
     *     $gt: 10,
     *     $lte: 40,
     *     offset: 15, // this in combination with the limit would work as a kind of pagination where only five results are returned, starting from result 15
     *     limit: 5,
     *   },
     *   SomeTimestamp: {
     *     $gte: +new Date(), // timestamp before now
     *   },
     * });
     *
     * @param {*} search
     */
    static async _singleZSetSearch(search) {
        const modelName = this._name();
        const model = this._model();
        const key = `${BaseModelHelper.getKey(modelName, "scoredindex")}:${search.key}`;
        let command = "zrangebyscore";

        const options = Object.assign({ limit: -1, offset: 0 }, search.options);
        var endpoints = ["(", "("];

        // NOTE: By default, the interval specified by min and max is closed (inclusive). It is possible to
        // specify an open interval (exclusive) by prefixing the score with the character (. For example:
        // @see https://redis.io/commands/zrangebyscore

        let val = BaseModelHelper.writeItem(model[search.key], search.value);

        var min = "-inf";
        if (options.$gt) {
            //min = parseFloat(options.$gt)
            min = BaseModelHelper.writeItem(model[search.key], options.$gt);
        } else if (options.$gte) {
            min = BaseModelHelper.writeItem(model[search.key], options.$gte);
            endpoints[0] = "";
        }

        var max = "+inf";
        if (options.$lt) {
            //max = parseFloat(options.$lt)
            max = BaseModelHelper.writeItem(model[search.key], options.$lt);
        } else if (options.$lte) {
            max = BaseModelHelper.writeItem(model[search.key], options.$lte);
            endpoints[1] = "";
        }

        if ((min === "+inf" && max !== "+inf") || (max === "-inf" && min !== "-inf") || min > max) {
            command = "zrevrangebyscore";
        }

        if (options.limit) {
            //Logger.error(command, key, endpoints[0] + min, endpoints[1] + max, 'LIMIT', options.offset, options.limit)
            return await BaseModel._redisCommand(
                command,
                key,
                endpoints[0] + min,
                endpoints[1] + max,
                "LIMIT",
                options.offset,
                options.limit
            );
        } else {
            return await BaseModel._redisCommand(command, key, endpoints[0] + min, options.endpoints[1] + max);
        }
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

        const model = this._model();        

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

        //return BaseModelHelper.generateMock(this._model());
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get the class model, but also add in system fields such as modified and created
     * if they don't already exist.
     */
    /*
    static _model() {
        let fields = this._model();
        if (!this._model) {
            throw new Error(`Could not find model for ${this._name()}`);
        }
        fields.created = {
            type: DataTypes.Date,
            index: true,
            defaultValue: function () {
                return new Date();
            },
        };
        fields.modified = {
            type: DataTypes.Date,
            onUpdateOverride: function () {
                return new Date();
            },
        };

        return fields;
    }
    */
}

module.exports = BaseModel;