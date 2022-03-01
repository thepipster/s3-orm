/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../utils/logger')
const Settings = require('../../Settings')
const _ = require('lodash')
const Promise = require('bluebird')
const BaseModelHelper = require('./utils/BaseModelHelper')
const Profiler = require('../../utils/Profiler')
const uuidv4 = require('uuid/v4')
const UniqueKeyViolationError = require('../../lib/UniqueKeyViolationError.js')
const StorePostgres = require('./utils/StorePostgres.js')

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
    constructor(data={}) {     

        // Grab model and prefix from the child static methods
        // NOTE: static methods are just methods on the class constructor
        var model = this.constructor._modelExtended()
        
        if (model){
            
            for (let key in model){
                
                var item = model[key]

                if (!_.isUndefined(data[key])){
                    this[key] = data[key]
                    //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                }
                else if (!_.isUndefined(item.defaultValue)){
                    if (typeof item.defaultValue == 'function'){
                        this[key] = item.defaultValue()             
                    }
                    else {
                        this[key] = item.defaultValue             
                    }
                }
                else if (!_.isUndefined(item.default)){
                    this[key] = item.default             
                }                
                else {
                    //Logger.error(`${key} is not defined: ${data[key]}`)
                    this[key] = null
                }
                
            }   

            if (data.id){
                this.id = data.id
            } 

        }     

        // id is required, so create a random id if not set
        if (!this.id){
            this.id = BaseModelHelper.generateToken()
        }

    }

    /**
     * Utility method to generate a new UUID
     */
    static getUUID(){
        return uuidv4()
    }

    static getByKey(key){
        throw new Error('BaseModel.getByKey is deprecated....')
    }

    static setByKey(key, val){
        throw new Error('BaseModel.setByKey is deprecated....')
    }

    /**
     * Return true if a model exists with this id
     * @param {string} id 
     */
    static async exists(id){
        let key = BaseModelHelper.getKey(this._name(), 'hash', id)
        return !!(await BaseModel._redisCommand('exists', key))
    }

    static async count(query){
        let docIds = await this.getIds(query)
        return docIds.length
    }

    static async distinct(field, query){
        // TODO: speed up. This is slow as it requires loading 
        // all docs then extracting the required field...
        let docs = await this.find(query)
        return _.uniq(_.map(docs, field))
    }

    /**
     * Perform required setup for this model
     */
    static async register(){
        //if (Settings.redisClient){
        //    await this._cleanIndices()
        //}
        //return
    }   

    /**
     * Delete this document from redis, and clear it out from any indices
     */
    async remove(){

        //Logger.info(`Removing ${this.id}`)

        if (!this.id){
            throw new Error(`Trying to remove document without an id!`)
        }
        
        var modelName = this.constructor._name()
        var model = this.constructor._modelExtended()

        // Remove hash model
        await BaseModel._redisCommand('del', BaseModelHelper.getKey(modelName, 'hash', this.id))

        // Remove from the idset, which is an index that contains all id's for this model
        //Logger.debug(`Removing ${this.id} from idsets set ${BaseModelHelper.getKey(modelName, 'idsets')}`)
        await BaseModel._redisCommand('srem', BaseModelHelper.getKey(modelName, 'idsets'), this.id)

        // Remove from the expires index, if there
        //Logger.debug(`Removing ${this.id} from expires set ${BaseModelHelper.getKey(modelName, 'expire')}`)
        await BaseModel._redisCommand('zrem', BaseModelHelper.getKey(modelName, 'expire'), this.id)

        for (let field in model){

            let val = this[field]

            if (model[field].index){
                let key = `${BaseModelHelper.getKey(modelName, 'index')}:${field}:${val}`
                //Logger.debug(`Removing ${this.id} from 'index' ${key}`)
                await BaseModel._redisCommand('srem', key, this.id)
            }

            if (model[field].unique){
                let key = `${BaseModelHelper.getKey(modelName, 'unique')}:${field}:${val}`
                //Logger.debug(`Removing ${this.id} from 'unique' ${key}`)
                await BaseModel._redisCommand('del', key, this.id)
            }

            if (BaseModelHelper.isNumericType(model[field].type)){
                let key = `${BaseModelHelper.getKey(modelName, 'scoredindex')}:${field}`
                //Logger.debug(`Removing ${this.id} from 'scoredindex' ${key}`)
                await BaseModel._redisCommand('zrem', key, this.id)
            }
        }

        return
    }

    /**
     * Delete a document from redis, and clear it out from any indices
     * @param {string} id The id of the document to delete
     */
    static async remove(id){

        //Logger.info(`Removing ${id}`)

        if (!id){
            throw new Error(`Trying to remove document without an id!`)
        }

        let doc = await this.loadFromId(id)
        
        if (doc){
            await doc.remove()
        }

        return
    }

    /**
     * Get the values for the given field
     * @param {*} query 
     * @param {*} field 
     */
    static async getField(query, field){
        
        let docIds = await this.getIds(query)

        return Promise.map(docIds, async (docId)=>{

            try {
                let key = BaseModelHelper.getKey(this._name(), 'hash', docId)
                return await BaseModel._redisCommand('hget', key, field)
            }
            catch(e){
                Logger.error(e)
                return null
            }  

        })

    }

    /**
     * Set the values for the given field
     * @param {*} query 
     * @param {*} field 
     */
    static async setFieldById(id, field, val){

        Logger.debug(`setFieldById(${id}, ${field}, ${val})`)

        try {            
            
            let model = this._modelExtended()            
            let dbkey = BaseModelHelper.getKey(this._name(), 'hash', id)

            // Get the old val (need for updating indexes)
            let oldVal = await BaseModel._redisCommand('hget', dbkey, field)
            oldVal = BaseModelHelper.parseItem(model[field], oldVal)

            //Logger.debug(`oldVal = ${oldVal}, newVal = ${val}`)

            // Update index now that we have the old val
            this._setIndexForField(id, field, val, oldVal)

            // Finally, do the update and return
            let parsedVal = BaseModelHelper.writeItem(model[field], val)    
            return await BaseModel._redisCommand('hset', dbkey, field, parsedVal)
        }
        catch(e){
            Logger.error(e)
            return null
        }  

    }

    /**
     * Set the values for the given field
     * @param {*} query 
     * @param {*} field 
     */
    static async setField(query, field, val){
        var docIds = await this.getIds(query)
        return Promise.map(docIds, async (id)=>{
            return await this.setFieldById(id, field, val)
        })
    }

    async save(opts){


        var modelName = this.constructor._name()
        var model = this.constructor._modelExtended()
        var baseKey = BaseModelHelper.getKey(modelName, 'hash', this.id)
        var cmd = [baseKey]
        var self = this

        //Logger.debug(`Saving ${modelName} ${this.id}`)

        try {

            cmd.push('id')
            cmd.push(this.id)

            for (var key in model){
                if (key in this && typeof this[key] != 'undefined'){

                    // Check if this key is unique and already exists (if so, throw an error)
                    if (model[key].unique){

                        var val = (model[key].type == 'string' && this[key]) ? this[key].toLowerCase() : this[key]
                        var keyUnique = `${BaseModelHelper.getKey(modelName, 'unique')}:${key}:${val}`
                        var alreadyExistsId = await BaseModel._redisCommand('get', keyUnique)

                        //Logger.warn(`${key} (${keyUnique}) val = ${val}, exists? ${alreadyExistsId}`)

                        if (alreadyExistsId && alreadyExistsId != this.id){
                            throw new UniqueKeyViolationError(`${key} = ${val} is unique, and already exists`)
                        }

                    }

                    cmd.push(key)

                    if (typeof model[key].onUpdateOverride == 'function'){
                        cmd.push(BaseModelHelper.writeItem(model[key], model[key].onUpdateOverride()))            
                    }
                    else {
                        cmd.push(BaseModelHelper.writeItem(model[key], this[key]))            
                    }

                }
            }


            await this._setIndices()

            //await BaseModel._redisCommand('hmset', cmd)
            await BaseModel._redisCommand('hmset', cmd)

            // If this item expires, add to the expires index
            if (opts && opts.expires){            
                let key = BaseModelHelper.getKey(modelName, 'expire')
                let expireTime = Math.round(Date.now() / 1000) + opts.expires
                //await Settings.redisClient.zadd(key, expireTime, this.id)
                await BaseModel._redisCommand('zadd', key, expireTime, this.id)
            }

            return this
        }
        catch(err){
            if (err instanceof UniqueKeyViolationError){
                // Let this error bubble up, don't catch here
                //Logger.error('UniqueKeyViolationError error')
                throw err
            }
            Logger.error(`[${modelName}] Error with save(), model = `, self, opts)
            Logger.error(err)
            return null
        }

        
    }

    static async loadFromId(id){
        
        try {

            var model = this._modelExtended()
            var key = BaseModelHelper.getKey(this._name(), 'hash', id)
            var data = await BaseModel._redisCommand('hgetall', key)
            
            if (!data) {
                //throw new Error(`${this.id} not found`);
                return null
            }
        
            let doc = new this()

            for (let key in model){            
                //Logger.info(`[${key}, ${model[key].type}] ${doc[key]} : ${data[key]}`)            
                if (key in data){
                    doc[key] = BaseModelHelper.parseItem(model[key], data[key])
                }
            }  
            
            doc.id = data.id

            // Check for expired items
            //await doc._clearExpireIndices()

            return doc
        }
        catch(err){
            Logger.error(`[${this._name()}] Error with loadFromId(), id = ${id}`, data, (!data))
            Logger.error(err)
            return null
        }

    }

    static async findOne(query = {}) {
        
        try {

            let docIds = await this.getIds(query)
            
            if (docIds.length == 0){
                return null
            }  

            return await this.loadFromId(docIds[0])      

        }
        catch(err){
            Logger.error(`[${this._name()}] Error with findOne(), query = `, query)
            Logger.error(err)
            return []
        }
    }

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

            let docIds = await this.getIds(query)
            
            if (docIds.length == 0){
                return []
            }

            return await Promise.map(docIds, async (docId)=>{
                try {
                    return await this.loadFromId(docId)
                }
                catch(e){
                    return null
                }  
            })   

        }
        catch(err){
            Logger.error(`[${this._name()}] Error with find(), query = `, query)
            Logger.error(err)
            return []
        }

    }

    static async getIds(query = {}) {
        
        const modelName = this._name()
        const structuredSearches = this._createStructuredSearchOptions(query);

        const uniqueSearch = structuredSearches.find((search) => search.type === 'unique');

        if (uniqueSearch) {
            //Logger.debug(`Finding '${modelName}'s with uniques:`, uniqueSearch);
            let ids = await this._uniqueSearch(uniqueSearch);
            return (ids) ? ids : [] 
        }
        
        const onlySets = structuredSearches.filter((search) => search.type === 'set');
        const onlyZSets = structuredSearches.filter((search) => search.type === 'zset');
        
        //Logger.debug('onlySets = ', onlySets)
        //Logger.debug('onlyZSets = ', onlyZSets)

        if (onlySets.length === 0 && onlyZSets.length === 0) {
            // no valid searches - return all ids
            let key = BaseModelHelper.getKey(modelName, 'idsets')
            let ids = await BaseModel._redisCommand('smembers', key);
            return (ids) ? ids : []
        }
        
        //Logger.debug(`Finding '${modelName}'s with these searches (sets, zsets):`, onlySets, onlyZSets);
        
        const setPromises = this._setSearch(onlySets);
        const zSetPromises = this._zSetSearch(onlyZSets);
        const searchResults = await Promise.all([setPromises, zSetPromises]);
        
        //Logger.info('searchResults = ', searchResults)
        
        if (onlySets.length !== 0 && onlyZSets.length !== 0) {
            // both searches - form intersection of them
            const intersection = _.intersection(searchResults[0], searchResults[1]);
            return (intersection) ? intersection : []
        }
        else {
            // only one form of search
            if (onlySets.length !== 0) {
                return (searchResults[0]) ? searchResults[0] : []
            }
            else {
                return (searchResults[1]) ? searchResults[1] : []
            }
        }
        
    }

    static _createStructuredSearchOptions(query) {

        let model = this._modelExtended()

        return Object.keys(query).map((key) => {
            
            const search = query[key];
            
            const definition = model[key];

            if (!definition){
                throw new Error(`No definition for ${this._name()} ${key}`)
            }

            const isNumeric = BaseModelHelper.isNumericType(definition.type)

            const structuredSearch = {
                key,
                options: {},
                type: 'undefined',
                value: search,
            };

            if (!isNumeric && !definition.index) {
                throw new Error(`Trying to search for non-indexed and non-unique property '${key}' is not supported.`);
            }
            
            const isDirectNumericSearch = !isNaN(parseInt(search, 10));
            const isSimpleIndexSearch = !isNumeric || isDirectNumericSearch;
            
            if (!isSimpleIndexSearch && isNumeric) {
                structuredSearch.type = 'zset';
                structuredSearch.options = search;
            }
            else if (definition.index === true) {
                structuredSearch.type = 'set';
            }

            return structuredSearch;
        });
    }

    static async _uniqueSearch(options) {
        const modelName = this._name()
        const model = this._modelExtended()
        let val = BaseModelHelper.writeItem(model[search.key], search.value)
        const key = `${BaseModelHelper.getKey(modelName, 'unique')}:${options.key}:${val}`;
        const id = await BaseModel._redisCommand('get', key)
        if (id) {
            return [id];
        }
        else {
            return [];
        }
    }

    static async _setSearch(searches) {
        
        const modelName = this._name()        
        const model = this._modelExtended()

        const keys = searches.map((search) => {
            let val = BaseModelHelper.writeItem(model[search.key], search.value)
            return `${BaseModelHelper.getKey(modelName, 'index')}:${search.key}:${val}`;
        });

        if (keys.length === 0) {
            // shortcut
            return [];
        }

        //Logger.warn('_setSearch', keys)
        return BaseModel._redisCommand('sinter', keys)
    }

    static async _zSetSearch(searches) {
        const singleSearches = await Promise.all(searches.map((search) => this._singleZSetSearch(search)));
        return _.intersection(...singleSearches);
    }
    
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
        
        const modelName = this._name()          
        const model = this._modelExtended()
        const key = `${BaseModelHelper.getKey(modelName, 'scoredindex')}:${search.key}`;            
        let command = 'zrangebyscore';

        const options = Object.assign({ limit: -1, offset: 0 }, search.options);
        var endpoints = ['(', '(']

        // NOTE: By default, the interval specified by min and max is closed (inclusive). It is possible to 
        // specify an open interval (exclusive) by prefixing the score with the character (. For example:
        // @see https://redis.io/commands/zrangebyscore

            let val = BaseModelHelper.writeItem(model[search.key], search.value)


        var min = '-inf'
        if (options.$gt){
            //min = parseFloat(options.$gt)
            min = BaseModelHelper.writeItem(model[search.key], options.$gt)
        }
        else if (options.$gte){
            min = BaseModelHelper.writeItem(model[search.key], options.$gte)
            endpoints[0] = ''
        }

        var max = '+inf'
        if (options.$lt){
            //max = parseFloat(options.$lt)
            max = BaseModelHelper.writeItem(model[search.key], options.$lt)
        }
        else if (options.$lte){
            max = BaseModelHelper.writeItem(model[search.key], options.$lte)
            endpoints[1] = ''
        }

        if ((min === '+inf' && max !== '+inf') || (max === '-inf' && min !== '-inf') || min > max) {
            command = 'zrevrangebyscore';
        }

        if (options.limit) {
            //Logger.error(command, key, endpoints[0] + min, endpoints[1] + max, 'LIMIT', options.offset, options.limit)
            return await BaseModel._redisCommand(command, key, endpoints[0] + min, endpoints[1] + max, 'LIMIT', options.offset, options.limit);
        }
        else {
            return await BaseModel._redisCommand(command, key, endpoints[0] + min,options. endpoints[1] + max);
        }
    }
    
    /**
     * Generate a token for use as a secret key, nonce etc.
     * @param length (optional) specify length, defaults to 24;
     * @return {string}
     */
    static generateToken(length = 24) {
        return BaseModelHelper.generateToken(length)
    }

    /**
     * Generate random sample data for this class
     */
    static generateMock(){
        return BaseModelHelper.generateMock(this._modelExtended())
    }
        

    /**
     * Loop through the indices for this model, and reset. That is, make
     * sure they are correct and aren't corrupt
     */
    static async _cleanIndices(){

        //var prof = new Profiler()
        //prof.start('_cleanIndices')
        let idList = await this.getIds()

        Logger.debug(`[${this._name()}._cleanIndices] found ${idList.length} items`)

        if (!_.isArray(idList)){
            return
        }

        // Get all the ids, then loop through each one and check it still exists. If not, remove
        await Promise.map(idList, async (id)=>{
            //prof.start('_cleanIndices.check')
            try {
                let exists = await this.exists(id)
                if (!exists){
                    Logger.warn(`[${this._name()}._cleanIndices] ${id} does not exist`)
                    await this.remove(id)
                }
            }
            catch(e){
                Logger.error(e)
            }  
            //prof.stop('_cleanIndices.check')
            return
        }, {concurrency:10})

        //prof.stop('_cleanIndices')     
        //prof.showResults()   

        return
    }

    /**
     * Look at the expires index for any docs that need to be removed
     */
    async _clearExpireIndices(){

        try {

            let unixNow = Math.round(Date.now() / 1000) 
            let modelName = this.constructor._name()
            let key = BaseModelHelper.getKey(modelName, 'expire')
            let expiredIds = await BaseModel._redisCommand('zrangebyscore', key, 0, unixNow)

            if (!expiredIds){
                return
            }

            //Logger.debug(`[${modelName}] EXPIRED IDS (${unixNow} = `, expiredIds)

            return Promise.map(expiredIds, async (id)=>{
                try {
                    return this.constructor.remove(id)
                }
                catch(e){
                    Logger.error(e)
                    return null
                }  
            })

        }
        catch(e){
            Logger.error(`[${this._name()}] Error with _clearExpireIndices()`)
            Logger.error(e)
        }

    }

    async _setIndices() {

        try {

            var oldValues = {}
            var model = this.constructor._modelExtended()
            var modelName = this.constructor._name()

            oldValues = await this.constructor.loadFromId(this.id)
            
            if (!oldValues){
                oldValues = {}
            }

            var keyIdset = BaseModelHelper.getKey(modelName, 'idsets')

            await BaseModel._redisCommand('sadd', keyIdset, this.id);

            //for (var key in model){
            await Promise.map(Object.keys(model), async (key)=>{
                return await this.constructor._setIndexForField(this.id, key, this[key], oldValues[key])
            })

            await this._clearExpireIndices()

            return
        }
        catch(e){
            Logger.error(`[${modelName}] Error with _setIndices()`)
            Logger.error('this.id = ', this.id)
            Logger.error('oldValues = ', oldValues)
            Logger.error(e)
        }

    }

    static async _setIndexForField(id, key, propVal, oldValue){


        var model = this._modelExtended()

        //if (key == 'aBoolean'){
        //    Logger.error(_.isUndefined(oldValue))
        //    Logger.warn(`>> [${key}] oldValue = ${oldValue}, newValue = ${propVal}: isUnique = ${isUnique}, isIndex = ${isIndex}, isInDb = ${isInDb}, isDirty = ${isDirty}`)
        //}

        // Need to convert to values that can be in Redis
        propVal = BaseModelHelper.writeItem(model[key], propVal)
        oldValue = BaseModelHelper.writeItem(model[key], oldValue)

        var modelName = this._name()

        var keyIndex = BaseModelHelper.getKey(modelName, 'index')
        var keyUnique = BaseModelHelper.getKey(modelName, 'unique')
        var keyZindex = BaseModelHelper.getKey(modelName, 'scoredindex')

        var definition = model[key]
        
        var isUnique = !!definition.unique
        var isIndex = !!definition.index
        var isInDb = !_.isNull(oldValue) // typeof oldValue !== 'undefined'
        var isDirty = propVal !== oldValue

        //if (key == 'aBoolean'){
        //    Logger.info(`>> [${key}] oldValue = ${oldValue}, newValue = ${propVal}: isUnique = ${isUnique}, isIndex = ${isIndex}, isInDb = ${isInDb}, isDirty = ${isDirty}`)
        //}

        // free old uniques
        if (isUnique && isDirty) {
            
            let oldUniqueValue = oldValue;
            
            if (oldUniqueValue && definition.type === 'string') {
                oldUniqueValue = oldUniqueValue.toLowerCase();
            }

            let val = propVal

            if (definition.type === 'string' && !_.isNull(val)) {
                val = val.toLowerCase()
            }

            //Logger.debug(`Removing old unique '${key}' from '${modelName}.${id}'`)                

            if (isInDb){
                await BaseModel._redisCommand('del', `${keyUnique}:${key}:${oldUniqueValue}`)
            }
            
            await BaseModel._redisCommand('set', `${keyUnique}:${key}:${val}`, id)
        }
    
        // set new normal index
        if (isIndex && isDirty) {
            
            if (BaseModelHelper.isNumericType(definition.type)) {
                // we use scored sets for things like "get all users older than 5"
                await BaseModel._redisCommand('zadd', `${keyZindex}:${key}`, propVal, id)
            }

            if (isInDb) {
                //if (key == 'aBoolean'){
                //    Logger.debug(`>>>>>>>>> Adding numeric index '${key}' to '${modelName}.${id}'; newValue: '${propVal}'; oldValue: '${oldValue}'.`)
               // }
                await BaseModel._redisCommand('srem', `${keyIndex}:${key}:${oldValue}`, id)
            }

            await BaseModel._redisCommand('sadd', `${keyIndex}:${key}:${propVal}`, id);
        }
        //else {
        //    Logger.error(`NOT adding index '${key}' to '${modelName}.${id}'; isInDb: '${isInDb}'; newValue: '${propVal}'; oldValue: '${oldValue}'.`)
        //}

        return

    }

    /**
     * Get the class model, but also add in system fields such as modified and created
     * if they don't already exist.
     */
    static _modelExtended(){
        let fields = this._model()
        if (!this._model){
            throw new Error(`Could not find model for ${this._name()}`)
        }
        fields.created = {type: 'date', index: true, defaultValue: function(){return new Date()}}
        fields.modified = {type: 'date', onUpdateOverride: function(){return new Date()}}
        return fields
    }

    static async _redisCommand(...args){
        //let args = [...arguments]
        let cmd = args[0]
        let args2 = args.slice(1)

        return new Promise((resolve, reject) => {     
            
            Settings.redisClient[cmd](...args2, (err, obj)=>{
                if (err){
                    Logger.error('Error with ' + cmd, ...args)
                    Logger.error(err.toString())
                    return reject(err)
                }
                return resolve(obj)
            })

        })  

    }

    async sync(PostgresModel){

        let options = {
        }

        if (this.constructor._model().uuid){
            options = {
                mode:'sync', 
                indexField: 'uuid',
                basePostgresQuery: {'uuid': this['uuid']},
                baseRedisQuery: {'uuid': this['uuid']},            
            }
        }
        else {
            options = {
                mode:'sync', 
                indexField: 'uid',
                basePostgresQuery: {'uid': this['uid']},
                baseRedisQuery: {'uid': this['uid']},            
            }            
        }

        let storage = new StorePostgres(PostgresModel, this, options)
        return await storage.sync()
    }

    static async syncAllToPostgres(PostgresModel, opts){
        let index = (this._model().uuid) ? 'uuid' : 'uid'
        let defaults = {mode:'redis-to-postgres', indexField: index}
        let options =  _.merge({}, defaults, opts);
        let storage = new StorePostgres(PostgresModel, this, options)
        return await storage.sync()
    }

    static async syncAllToRedis(PostgresModel, opts){
        let index = (this._model().uuid) ? 'uuid' : 'uid'
        let defaults = {mode:'postgres-to-redis', indexField: index}
        let options =  _.merge({}, defaults, opts);
        let storage = new StorePostgres(PostgresModel, this, options)
        return await storage.sync()
    }

    static async syncAll(PostgresModel, opts){
        let index = (this._model().uuid) ? 'uuid' : 'uid'
        let defaults = {mode:'sync', indexField: index}
        let options =  _.merge({}, defaults, opts);
        let storage = new StorePostgres(PostgresModel, this, options)
        return await storage.sync()
    }


}

module.exports = BaseModel