/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../utils/logger')
const Settings = require('../../Settings')
const _ = require('lodash')
const Promise = require('bluebird')
const BaseModelHelper = require('./BaseModelHelper.js')
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
        var model = this.constructor._model()
        
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
        // Grab model and prefix from the child static methods
        // NOTE: static methods are just methods on the class constructor
        var model = this.constructor._model()
        
        var mongooseModel = {}

        // Convert to a mongoose schema
   
        for (let key in model){
            
            var item = model[key]
            mongooseModel[key] = {}

            if (item.defaultValue){
                mongooseModel.default = item.defaultValue
            }
            else if (item.default){
                mongooseModel.default = item.default
            }

            if (item.enum){
                mongooseModel.enum = item.enum
            }

            if (item.index){
                mongooseModel.index = item.index
            }

            if (item.unique){
                mongooseModel.unique = item.unique
            }

            switch(item.type){
                case 'string': mongooseModel.type = String; break;
                case 'boolean': mongooseModel.type = String; break;
                case 'array': mongooseModel.type = Schema.Types.Mixed; break;
                case 'json': mongooseModel.type = String; break;
                case 'object': mongooseModel.type = Schema.Types.Mixed; break;
                case 'number': mongooseModel.type = Number; break;
                case 'float': mongooseModel.type = Number; break;
                case 'integer': mongooseModel.type = Number; break;
                case 'timestamp': mongooseModel.type = Date; break;
                case 'date': mongooseModel.type = Date; break;
            }    
                            
        }   

        // Create the mongoose schema
        let ModelSchema = new Schema(mongooseModel,{ timestamps: { createdAt: 'created', updatedAt: 'modified' }})

        // Register the model with Mongoose
        let Model = mongoose.model(this.constructor._name(), ModelSchema)
    }   

    /**
     * Delete this document from redis, and clear it out from any indices
     */
    async remove(){

        if (!this.id){
            throw new Error(`Trying to remove document without an id!`)
        }
        
        var modelName = this.constructor._name()
        var model = this.constructor._model()

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
                await BaseModel._redisCommand('srem', key, this.id)
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
        let doc = await this.loadFromId(id)
        if (!doc){
            Logger.warn(`Could not remove ${id}`)
            return null
        }
        if (!doc.id){
            doc.id = id
        }
        return await doc.remove()
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

        try {
            let key = BaseModelHelper.getKey(this._name(), 'hash', id)
            return await BaseModel._redisCommand('hset', key, field, val)
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

        return Promise.map(docIds, async (docId)=>{

            try {
                let key = BaseModelHelper.getKey(this._name(), 'hash', docId)
                return await BaseModel._redisCommand('hset', key, field, val)
            }
            catch(e){
                Logger.error(e)
                return null
            }  

        })

    }

    async save(opts){

        let Model = this._getModel()
        let definitions = this._model()

        //let item = await Model.findOne(query)
        let data = {}

        for (var key in definitions){
            if (key in this){
                data[key] = BaseModelHelper.writeItem(definitions[key], this[key])
            }
        }

        let doc = new Model(data)
        doc._id = this.id

        return await doc.save()
        
    }

    _getModel(){
        return mongoose.model(BaseModelHelper.prefix + ':' + this.constructor._name())
    }

    static _getModel(){
        return mongoose.model(BaseModelHelper.prefix + ':' + this._name())
    }

    static _create(data){

        let definitions = this._model()

        if (!data) {
            //throw new Error(`${this.id} not found`);
            return null
        }

        let doc = new this()

        for (let key in definitions){            
            if (key in data){
                doc[key] = BaseModelHelper.parseItem(definitions[key], data[key])
            }
        }  
        
        doc.id = data.id

        return doc
    }

    static async loadFromId(id){      
        let Model = this._getModel()
        let data = await Model.findOne({_id:id})
        return this._create(data)
    }

    static async findOne(query = {}) {        
        let Model = this._getModel()
        let data = await Model.findOne(query)
        return this._create(data)
    }

    static async find(query = {}) {

        let Model = this._getModel()
        let items = await Model.find(query)

        return Promise.map(items, (data)=>{
            try {
                return this._create(data)
            }
            catch(e){
                return null
            }  
        }) 

    }

    static async getIds(query = {}) {    
        let Model = this._getModel()
        let items = await Model.find(query, {_id:1})
        return items.map(function(item){
            return {id:item._id}
        })
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
        return BaseModelHelper.generateMock(this._model())
    }
        

}

module.exports = BaseModel