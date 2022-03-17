import Logger from "../utils/Logger.js";
import {isUndefined, uniq, map, isEmpty, intersection, slice} from "lodash";
import Promise from "bluebird";
import UniqueKeyViolationError from "../errors/UniqueKeyViolationError";
import QueryError from "../errors/QueryError";
import Indexing from "./Indexing.js";

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
                    
                    if (!isUndefined(data[key])) {
                        //this[key] = data[key];
                        this[key] = data[key];
                        //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                    } 
                    else if (!isUndefined(item.defaultValue)) {
                        if (typeof item.defaultValue == "function") {
                            this[key] = item.defaultValue();
                        } 
                        else {
                            this[key] = item.defaultValue;
                        }
                    } 
                    else if (!isUndefined(item.default)) {
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
        const modelName = this._name();        
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
        return uniq(map(docs, field));
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
            //Logger.debug(`[${chalk.green(modelName)}] deleting index for ${chalk.yellow(key)}, val = ${this[key]}`);
            await indx.removeIndexForField(key, this[key]);
        }
        
        // Remove data
        await s3.delObject(`${modelName}/${this.id}`);

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
                // Logger.warn(err);
            }
            if (!oldValues){
                oldValues = {};
            }
        }
        else {
            // We need to set the id! So get the highest id in use for this model
            let maxId = await indx.getMaxId();
            //Logger.debug(`[${chalk.green(modelName)}] maxId = ${maxId} (${typeof maxId})`);
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

            const defn = model[key];
            const val = this[key];   

            //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${val}`);

            // Check if this key is unique and already exists (if so, throw an error)
            if (defn.unique) {                    
                //Logger.debug(`Checking if ${chalk.green(modelName)}.${chalk.yellow(key)} is unique, val = ${val}`);
                let alreadyExists = await indx.isMemberUniques(key, val);    
                if (alreadyExists) {
                    throw new UniqueKeyViolationError(`Could not save as ${key} = ${val} is unique, and already exists`);
                }
            }

            
            //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}]data[key] = ${data[key]}`);
            
            if (typeof defn.onUpdateOverride == "function") {
                this[key] = defn.onUpdateOverride();
            }
                       

        });

        //
        // Write data to S3
        //

        //Logger.debug(`[${chalk.greenBright(modelName)}] Saving object ${this.id} to ${modelName}/${this.id}`);
        await s3.setObject(`${modelName}/${this.id}`, this);

        //
        // Setup indexes...
        //

        // Update the index with the id (which it needs to set the correct path for indexes!)
        indx.id = this.id;

        //Logger.debug(`[${chalk.greenBright(modelName)}] Setting up indexes for instance ${this.id}`);
    
        await Promise.map(keys, async (key)=>{
            
            try {
                //Logger.debug(`[${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${this[key]}, prevVal = ${oldValues[key]}`);
                await indx.setIndexForField(key, this[key], oldValues[key]);
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

    static async loadFromId(id) {
        try {

            const modelName = this._name();
            const key = `${modelName}/${id}`;
            const data = await this.s3.getObject(key);
            return new this(data);

        } catch (err) {
            Logger.warn(`[${this._name()}] Error with loadFromId(), id = ${id}`);
            //Logger.error(err);
            return null;
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async findOne(query, options) {
        try {
            let docIds = await this.getIds(query, options);

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
    static async find(query, options) {

        try {
            
            let docIds = await this.getIds(query, options);

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

    /**
     * Get a list of id's based on the query and options
     * @param {*} query Support for; gt, gte, lt, lte
     * @param {*} options Support for; limit, offset, order (ASC or DESC), 
     * @returns 
     */
    static async getIds(query, options) {
        
        const modelName = this._name();
        const model = this._schema();
        const indx = new Indexing(null, modelName, model, this.s3);
        var queryParts = [];
        var results = [];

        // Set up any default options
        if (!options){
            options = {
                offset: 0,
                limit: 1000
            }
        }
        options.order = (options.order) ? options.order : 'ASC';

        // Deal with the special case of an empty query, which means return everything!
        if (isEmpty(query)){

            const list = await this.s3.listObjects(modelName);
            
            for (let i=0; i<list.length; i+=1){
                let key = list[i];
                let data = await this.s3.getObject(key);
                results.push(data.id);
            }
                
            return results;
        }


        //Logger.debug('query = ', query);

        // Convert query into a flat array for easy parsing

        for (let key in query){

            const defn = model[key];
            var qry = {
                key, 
                type: 'basic',
                value: query[key]
            };

            if (defn.type.isNumeric) {
                qry.type = 'numeric';
                qry.order = options.order;
            }
            else if (defn.isUnique) {
                qry.type = 'unique';
            }

            queryParts.push(qry);
        }

        //Logger.debug('queryParts = ', queryParts);

        // Now process each part of the query...

        await Promise.map(queryParts, async (qry) => {
            if (qry.type == 'numeric'){
                if (typeof qry.value == 'number'){
                    qry.value = {$gte: qry.value, $lte: qry.value};
                }
                results.push(await indx.searchNumeric(qry.key, qry.value));
            }
            else if (qry.type == 'basic'){
                results.push(await indx.search(qry.key, qry.value));
            }
            else if (qry.type == 'unique'){
                results.push(await indx.search(qry.key, qry.value));
            }
        
        });

        // And get the intersaction of all the results

        let inter = intersection(...results);

        // Support paging
        if (options.offset){
            inter = slice(inter, options.offset);
        }
        if (options.limit){
            inter = slice(inter, 0, options.limit);
        }

        //Logger.debug(results);
        //Logger.info(inter);

        return inter;

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

export default BaseModel;
