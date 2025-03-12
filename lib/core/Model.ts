import Logger from "../utils/Logger";
import {isUndefined, uniq, map, isEmpty, intersection, slice} from "lodash";
import {Promise} from "bluebird";
import UniqueKeyViolationError from "../errors/UniqueKeyViolationError";
import QueryError from "../errors/QueryError";
import Indexing from "./Indexing";
import {Storm} from "./Storm";
import {cyan, blue, green} from "colorette";
import {Op, Query, type KeyValObject} from "../types";
import { ModelMetaStore, type ColumnSchema, type ModelSchema } from "../decorators/ModelMetaStore";

const debugMode = true;

export class Model {
    
    id: number = 0;
    __v: number = 1;
        
    //["constructor"]: typeof Model;

    // ///////////////////////////////////////////////////////////////////////////////////////
    
    constructor(data?: KeyValObject) {

        if (!data){
            data = {};
        }

        // Grab model meta data to get the column definitions
        //const model:ModelSchema = ModelMeta[this.constructor.name];
        const model:ModelSchema = ModelMetaStore.get(this.constructor.name);
       
        if (model) {
            for (let key in model) {

                var defn = model[key];
                //let defn = (model[key].type) ? model[key].type : model[key];

                try {
                    
                    if (!isUndefined(data[key])) {
                        //this[key] = data[key];
                        this[key] = data[key];
                        //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                    } 
                    else if (!isUndefined(defn.default)) {
                        if (typeof defn.default == "function") {
                            this[key] = defn.default();
                        } 
                        else {
                            this[key] = defn.default;
                        }
                    } 
                    else if (!isUndefined(defn.default)) {
                        this[key] = defn.default;
                    } 
                    else {
                        //Logger.error(`${key} is not defined: ${data[key]}`)
                        this[key] = null;
                    }
    
                    Logger.info(`${cyan(key)} of type ${blue(defn.name)} = ${green(data[key])} (${typeof data[key]})`);
    
                }
                catch(err){
                    Logger.error(defn, data[key]);
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

    private static _name(): string{
        return this.name;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    toJson(){
        
        const keys = Object.keys(this);
        let item = {};

        for (let i=0; i<keys.length; i+=1){
            let key = keys[i];
            if (key in this && isUndefined(this[key])) { // typeof this[key] != "undefined") {
                item[key] = this[key];
            }
        }

        return item;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async resetIndex(){
        const modelName = this._name();
        const indx = new Indexing(null, modelName);
        await indx.cleanIndices();
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Return true if a model exists with this id
     * @param {string} id
     */
    static async exists(id) {
        const modelName = this._name();        
        return await Storm.s3().hasObject(`${modelName}/${id}`);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async max(fieldName){
        const modelName = this._name();        
        const model = ModelMetaStore.getColumn(modelName, fieldName);
        if (!model.isNumeric){
            throw new QueryError(`${modelName}.${fieldName} is not numeric!`);
        }
        return await Storm.s3().zGetMax(`${modelName}/${fieldName}`, false);
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

        const modelName = this.constructor.name;
        const model: ModelSchema = ModelMetaStore.get(modelName);
        const indx = new Indexing(this.id, modelName);


        for (let key in model) {
            //Logger.debug(`[${chalk.default.green(modelName)}] deleting index for ${chalk.default.yellow(key)}, val = ${this[key]}`);
            await indx.removeIndexForField(key, this[key]);
        }
        
        // Remove data
        await Storm.s3().delObject(`${modelName}/${this.id}`);

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

        const modelName = this.constructor.name;
        const model: ModelSchema = ModelMetaStore.get(modelName);
        const s3 = Storm.s3();
        const indx = new Indexing(this.id, modelName);
        var oldValues = {};

        // If the id field is set (non-zero), then attempt
        // to load the old values from the db
        if (this.id){
            try {
                oldValues = await Model.loadFromId(this.id);
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
            //Logger.debug(`[${chalk.default.green(modelName)}] maxId = ${maxId} (${typeof maxId})`);
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

            //Logger.debug(`${chalk.default.green(modelName)}.${chalk.default.yellow(key)}] val = ${val}`);

            // Check if this key is unique and already exists (if so, throw an error)
            if (defn.unique) {                    
                //Logger.debug(`Checking if ${chalk.default.green(modelName)}.${chalk.default.yellow(key)} is unique, val = ${val}`);
                let alreadyExists = await indx.isMemberUniques(key, val);    
                if (alreadyExists) {
                    throw new UniqueKeyViolationError(`Could not save as ${key} = ${val} is unique, and already exists`);
                }
            }

            //Logger.debug(`${green(modelName)}.${yellow(key)} = ${val}`);
        
            if (typeof defn.onUpdateOverride == "function") {
                this[key] = defn.onUpdateOverride();
            }
                       

        });

        //
        // Write data to S3
        //

        //Logger.debug(`[${chalk.default.greenBright(modelName)}] Saving object ${this.id} to ${modelName}/${this.id}`);
        await s3.setObject(`${modelName}/${this.id}`, this);

        //
        // Setup indexes...
        //

        // Update the index with the id (which it needs to set the correct path for indexes!)
        indx.id = this.id;


        //Logger.debug(`[${green(modelName)}] Setting up indexes for instance ${this.id}`);
    
        await Promise.map(keys, async (key)=>{
            
            try {
                //Logger.debug(`[${chalk.default.green(modelName)}.${chalk.default.yellow(key)}] val = ${this[key]}, prevVal = ${oldValues[key]}`);
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

        //Logger.debug(`[${green(modelName)}] done setting indexes`);

        // TODO: add support for expires

        // If this item expires, add to the expires index
        //if (colMeta && colMeta.expires) {  
            //Logger.debug(`[${chalk.default.greenBright(modelName)}] Setting expires`);
        //    await indx.addExpires(colMeta.expires);
        //}

        // Finally, expire anything that needs
        // TODO: test expires
        //await indx.clearExpireIndices();

        return this;


    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async loadFromId(id: number) {
        try {

            const modelName = this._name();
            const key = `${modelName}/${id}`;
            const data = await Storm.s3().getObject(key);
            return new this(data);

        } catch (err) {
            Logger.warn(`[${this._name()}] Error with loadFromId(), id = ${id}`);
            //Logger.error(err);
            return null;
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static async findOne(query: Query) {
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
    static async find(query: Query) {

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

    /**
     * Get a list of id's based on the query and options. Supports queries like;
     * Query for all documents where the fullName field contains a substring of 'bob'
     *   qry = {fullName: 'bob'};
     * Query for all documents where the fullName field contains a substring of 'ob' (so bob would match this)
     *   qry = {fullName: 'ob'};
     * Query for all documents where the age = 20
     *   qry = {age: 20};
     * Query for all documents where the age is greater than or equal to 19
     *   qry = {age: {$gte: 19}};
     * Query for all documents where the fullName field contains a substring of 'bob' AND the age is greater than or equal to 19
     *   qry = {fullName: 'bob', age: {$gte: 19}};
     * Query for all documents where the score is les than 50.56
     *   qry = {score: {$lt: 50.56}};
     * 
     * @param {Query} query Support for MongoDB-style operators ($gt, $gte, $lt, $lte, etc) 
     * and support for; limit, offset, order (ASC or DESC)
     * @returns 
     */
    static async getIds(query: Query) {
        
        const modelName: string = this._name();
        const indx = new Indexing(null, modelName);
        var queryParts = [];
        var results = [];

        // Set up any default options
        if (!query.order) {
            query.order = 'ASC';
        }
        if (!query.limit) {
            query.limit = 1000;
        }
        //if (!query.offset) {
        //    query.offset = 0;
        //}

        // Deal with the special case of an empty query, which means return everything!
        if (isEmpty(query)){
            const list = await Storm.s3().listObjects(modelName);
            
            for (let i=0; i<list.length; i+=1){
                let key = list[i];
                let data = await Storm.s3().getObject(key);
                results.push(data.id);
            }
                
            return results;
        }

        // Convert query into a flat array for easy parsing
        for (let key in query){

            const defn: ColumnSchema = ModelMetaStore.getColumn(modelName, key);
            //const defn = model[key];

            const value = query[key];
            let qry: any = {key, type: 'basic', value};

            if (defn.isNumeric) {
                qry.type = 'numeric';
                qry.order = query.order;
                // Handle MongoDB-style operators if present
                if (typeof value === 'object' && !Array.isArray(value)) {
                    //const op = value as Op;
                    if (value.$gt !== undefined || value.$gte !== undefined || value.$lt !== undefined || value.$lte !== undefined) {
                        qry.value = value;
                    }
                }
            }
            else if (defn.unique) {
                qry.type = 'unique';
            }

            queryParts.push(qry);
        }

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
        if (query.offset && query.limit){
            inter = slice(inter, query.offset, query.offset + query.limit);
        }
        else if (query.limit){
            inter = slice(inter, 0, query.limit);
        }


        //Logger.debug(results);
        //Logger.info(inter);

        return inter;

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Generate random sample data for this class
     */
    /*
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
    */
    
}
