"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
const Logger_1 = __importDefault(require("../utils/Logger"));
const lodash_1 = require("lodash");
const bluebird_1 = require("bluebird");
const UniqueKeyViolationError_1 = __importDefault(require("../errors/UniqueKeyViolationError"));
const QueryError_1 = __importDefault(require("../errors/QueryError"));
const Indexing_1 = require("./Indexing");
const Stash_1 = require("./Stash");
const colorette_1 = require("colorette");
const ModelMetaStore_1 = require("../decorators/ModelMetaStore");
const debugMode = true;
class Model {
    //__schema: ModelSchema;
    // ///////////////////////////////////////////////////////////////////////////////////////
    constructor(data) {
        this.id = 0;
        this.__v = 1;
        if (!data) {
            data = {};
        }
        // Grab model meta data to get the column definitions
        //const model:ModelSchema = ModelMeta[this.constructor.name];
        const model = ModelMetaStore_1.ModelMetaStore.get(this.constructor.name);
        //this.__schema = model;
        if (model) {
            for (let key in model) {
                var defn = model[key];
                //let defn = (model[key].type) ? model[key].type : model[key];
                try {
                    if (!(0, lodash_1.isUndefined)(data[key])) {
                        //this[key] = data[key];
                        this[key] = data[key];
                        //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                    }
                    else if (!(0, lodash_1.isUndefined)(defn.default)) {
                        if (typeof defn.default == "function") {
                            this[key] = defn.default();
                        }
                        else {
                            this[key] = defn.default;
                        }
                    }
                    else if (!(0, lodash_1.isUndefined)(defn.default)) {
                        this[key] = defn.default;
                    }
                    else {
                        //Logger.error(`${key} is not defined: ${data[key]}`)
                        this[key] = null;
                    }
                    if (Stash_1.Stash.debug) {
                        Logger_1.default.debug(`[${this.constructor.name}.constructor] ${(0, colorette_1.cyan)(key)} of type ${(0, colorette_1.blue)(defn.name)} = ${(0, colorette_1.green)(data[key])} (${typeof data[key]})`);
                    }
                }
                catch (err) {
                    Logger_1.default.error(defn, data[key]);
                    Logger_1.default.error(`Error setting data in constructor`, err.toString());
                    process.exit(1);
                }
            }
            if (data.id) {
                this.id = data.id;
            }
        }
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static _name() {
        return this.name;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    toJson() {
        const keys = Object.keys(this);
        let item = {};
        for (let i = 0; i < keys.length; i += 1) {
            let key = keys[i];
            if (key in this && (0, lodash_1.isUndefined)(this[key])) { // typeof this[key] != "undefined") {
                item[key] = this[key];
            }
        }
        return item;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    toString() {
        const model = ModelMetaStore_1.ModelMetaStore.get(this.constructor.name);
        let fieldStrings = {};
        for (let key in model) {
            const defn = model[key];
            fieldStrings[key] = defn.encode(this[key]);
            //Logger.debug(`[${cyan(key)} | ${gray(typeof this[key])}] =  ${green(this[key])} -> ${blue(fieldStrings[key])}`);
        }
        return JSON.stringify(fieldStrings);
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static resetIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = this._name();
            const indx = new Indexing_1.Indexing(null, modelName);
            yield indx.cleanIndices();
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Return true if a model exists with this id
     * @param {string} id
     */
    static exists(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = this._name();
            return yield Stash_1.Stash.s3().hasObject(`${modelName}/${id}`);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static max(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = this._name();
            const model = ModelMetaStore_1.ModelMetaStore.getColumn(modelName, fieldName);
            if (!model.isNumeric) {
                throw new QueryError_1.default(`${modelName}.${fieldName} is not numeric!`);
            }
            const zmax = yield Stash_1.Stash.s3().zGetMax(`${modelName}/${fieldName}`, true);
            return (model.type == 'float') ? parseFloat(zmax.score) : parseInt(zmax.score, 10);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static min(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = this._name();
            const model = ModelMetaStore_1.ModelMetaStore.getColumn(modelName, fieldName);
            if (!model.isNumeric) {
                throw new QueryError_1.default(`${modelName}.${fieldName} is not numeric!`);
            }
            const zmax = yield Stash_1.Stash.s3().zGetMin(`${modelName}/${fieldName}`, true);
            return (model.type == 'float') ? parseFloat(zmax.score) : parseInt(zmax.score, 10);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static count(query) {
        return __awaiter(this, void 0, void 0, function* () {
            let docIds = yield this.getIds(query);
            return docIds.length;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Normalize the query to ensure it has the correct structure
     * @param query The query to normalize
     * @returns Normalized query options
     */
    static normalizeQuery(query) {
        if ('where' in query || 'order' in query || 'limit' in query || 'offset' in query || 'scores' in query) {
            return query;
        }
        return { where: query };
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static distinct(field, query) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: speed up. This is slow as it requires loading
            // all docs then extracting the required field...
            let docs = yield this.find(query);
            return (0, lodash_1.uniq)((0, lodash_1.map)(docs, field));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Delete this document from redis, and clear it out from any indices
     */
    remove() {
        return __awaiter(this, void 0, void 0, function* () {
            //Logger.info(`Removing ${this.id}`)
            if (!this.id) {
                throw new Error(`Trying to remove document without an id!`);
            }
            const modelName = this.constructor.name;
            const model = ModelMetaStore_1.ModelMetaStore.get(modelName);
            const indx = new Indexing_1.Indexing(this.id, modelName);
            for (let key in model) {
                //Logger.debug(`[${chalk.default.green(modelName)}] deleting index for ${chalk.default.yellow(key)}, val = ${this[key]}`);
                yield indx.removeIndexForField(key, this[key]);
            }
            // Remove data
            yield Stash_1.Stash.s3().delObject(`${modelName}/${this.id}`);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Delete a document from redis, and clear it out from any indices
     * @param {string} id The id of the document to delete
     */
    static remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            //Logger.info(`Removing ${id}`)
            if (!id) {
                throw new Error(`Trying to remove document without an id!`);
            }
            let doc = yield this.loadFromId(id);
            if (doc) {
                yield doc.remove();
            }
            return;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = this.constructor.name;
            const model = ModelMetaStore_1.ModelMetaStore.get(modelName);
            const s3 = Stash_1.Stash.s3();
            const indx = new Indexing_1.Indexing(this.id, modelName);
            var oldValues = {};
            // If the id field is set (non-zero), then attempt
            // to load the old values from the db
            if (this.id) {
                try {
                    oldValues = yield Model.loadFromId(this.id);
                }
                catch (err) {
                    // Logger.warn(err);
                }
                if (!oldValues) {
                    oldValues = {};
                }
            }
            else {
                // We need to set the id! So get the highest id in use for this model
                let maxId = yield indx.getMaxId();
                //Logger.debug(`[${chalk.default.green(modelName)}] maxId = ${maxId} (${typeof maxId})`);
                this.id = maxId + 1;
                yield indx.setMaxId(this.id);
            }
            //Logger.debug(`Saving ${modelName} ${this.id}`)
            var keys = [];
            for (var key in model) {
                if (key in this && typeof this[key] != "undefined") {
                    keys.push(key);
                }
            }
            let fieldStrings = {};
            yield bluebird_1.Promise.map(keys, (key) => __awaiter(this, void 0, void 0, function* () {
                const defn = model[key];
                //Logger.debug(`${chalk.default.green(modelName)}.${chalk.default.yellow(key)}] val = ${val}`);
                // Check if this key is unique and already exists (if so, throw an error)
                if (defn.unique) {
                    // In some cases, like a date, the value in the instance field will be a Date object,
                    // so we need to parse it to an internal representation before indexing it.
                    const val = Model.parseValue(modelName, key, this[key]);
                    let alreadyExists = yield indx.isMemberUniques(key, val);
                    if (alreadyExists) {
                        throw new UniqueKeyViolationError_1.default(`Could not save as ${key} = ${val} is unique, and already exists`);
                    }
                }
                //Logger.debug(`${green(modelName)}.${yellow(key)} = ${val}`);
                fieldStrings[key] = defn.encode(this[key]);
                //if (typeof defn.onUpdateOverride == "function") {
                //    this[key] = defn.onUpdateOverride();
                //}
            }));
            //
            // Write data to S3
            //
            //Logger.debug(`[${chalk.default.greenBright(modelName)}] Saving object ${this.id} to ${modelName}/${this.id}`);
            // Can save as a hash object, use the fieldStrings which has made use of custom toString operators
            yield s3.setObject(`${modelName}/${this.id}`, fieldStrings);
            //
            // Setup indexes...
            //
            // Update the index with the id (which it needs to set the correct path for indexes!)
            indx.id = this.id;
            //Logger.debug(`[${green(modelName)}] Setting up indexes for instance ${this.id}`);
            yield bluebird_1.Promise.map(keys, (key) => __awaiter(this, void 0, void 0, function* () {
                try {
                    //Logger.debug(`[${chalk.default.green(modelName)}.${chalk.default.yellow(key)}] val = ${this[key]}, prevVal = ${oldValues[key]}`);
                    // In some cases, like a date, the value in the instance field will be a Date object,
                    // so we need to parse it to an internal representation before indexing it.        
                    const val = Model.parseValue(modelName, key, this[key]);
                    yield indx.setIndexForField(key, val, oldValues[key]);
                }
                catch (err) {
                    if (err instanceof UniqueKeyViolationError_1.default) {
                        // Let this error bubble up, don't catch here
                        //Logger.error('UniqueKeyViolationError error')
                        throw err;
                    }
                    Logger_1.default.error('key = ', key);
                    Logger_1.default.error('data = ', this);
                    Logger_1.default.error('oldValues = ', oldValues);
                    Logger_1.default.error(err.toString());
                    process.exit(1);
                }
            }), { concurrency: 1 });
            //Logger.debug(`[${green(modelName)}] done setting indexes`);
            // TODO: add support for expires
            // If this item expires, add to the expires index
            //if (colMeta && colMeta.expires) {  
            //Logger.debug(`[${chalk.default.greenBright(modelName)}] Setting expires`);
            //    await indx.addExpires(colMeta.expires);
            //}
            // Finally, expire anything that needs
            //await indx.clearExpireIndices();
            return this;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static parseValue(modelName, key, val) {
        const defn = ModelMetaStore_1.ModelMetaStore.getColumn(modelName, key);
        return (defn.encode) ? defn.encode(val) : val;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static loadFromId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (id == undefined || id == null) {
                throw new Error(`Trying to load document without an id!`);
            }
            try {
                const modelName = this._name();
                const model = ModelMetaStore_1.ModelMetaStore.get(modelName);
                const key = `${modelName}/${id}`;
                //Logger.debug(`[${this._name()}] Loading from id ${id}, key = ${key}`);
                const data = yield Stash_1.Stash.s3().getObject(key);
                //Logger.debug(`[${this._name()}] Loaded`, data);
                // Apply the correct decode operators to the data 
                // to ensure it is in the correct format
                for (let key in model) {
                    var defn = model[key];
                    //Logger.debug(`[${this._name()}] data[key] = ${data[key]} --> ${defn.fromString(data[key])}`);
                    data[key] = defn.decode(data[key]);
                }
                return new this(data);
            }
            catch (err) {
                Logger_1.default.warn(`[${this._name()}] Error with loadFromId(), id = ${id}`);
                //Logger.error(err);
                return null;
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static findOne(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let docIds = yield this.getIds(query);
                if (docIds.length == 0) {
                    return null;
                }
                return yield this.loadFromId(docIds[0]);
            }
            catch (err) {
                Logger_1.default.error(`[${this._name()}] Error with findOne(), query = `, query);
                Logger_1.default.error(err);
                return null;
            }
        });
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
    static find(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let docIds = yield this.getIds(query);
                if (docIds.length == 0) {
                    return [];
                }
                return yield bluebird_1.Promise.map(docIds, (docId) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        return yield this.loadFromId(docId);
                    }
                    catch (e) {
                        return null;
                    }
                }));
            }
            catch (err) {
                Logger_1.default.error(`[${this._name()}] Error with find(), query = `, query);
                Logger_1.default.error(err);
                return [];
            }
        });
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
     * @param {QueryOptions} query Support for MongoDB-style operators ($gt, $gte, $lt, $lte, etc)
     * and support for; limit, offset, order (ASC or DESC)
     * @returns
     */
    static getIds(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = this._name();
            // Allow for simple queries to be passed in
            query = this.normalizeQuery(query);
            // Parse any query values
            if (query.where && typeof query.where === 'object') {
                for (let key in query.where) {
                    if (typeof query.where[key] === 'object') {
                        for (let subkey in query.where[key]) {
                            query.where[key][subkey] = Model.parseValue(modelName, key, query.where[key][subkey]);
                        }
                    }
                    else {
                        query.where[key] = Model.parseValue(modelName, key, query.where[key]);
                    }
                    //Logger.info(`[${modelName}.getIds] Parsing query value for ${key} = `, query.where[key]);
                }
            }
            const indx = new Indexing_1.Indexing(null, modelName);
            var queryParts = [];
            var results = [];
            if (!query.where) {
                query.where = {};
            }
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
            if ((0, lodash_1.isEmpty)(query.where)) {
                const list = yield Stash_1.Stash.s3().listObjects(modelName);
                for (let i = 0; i < list.length; i += 1) {
                    let key = list[i];
                    let data = yield Stash_1.Stash.s3().getObject(key);
                    results.push(data.id);
                }
                return results;
            }
            // Convert query into a flat array for easy parsing
            for (let key in query.where) {
                const defn = ModelMetaStore_1.ModelMetaStore.getColumn(modelName, key);
                let keyVal = query.where[key];
                let qry = { key, type: 'basic', value: keyVal };
                if (defn.isNumeric) {
                    qry.type = 'numeric';
                    // Handle MongoDB-style operators if present
                    if (typeof keyVal === 'object' && !Array.isArray(keyVal)) {
                        // For numeric fields, if no range operators are provided, treat the value as an exact match
                        if (keyVal.$gt !== undefined || keyVal.$gte !== undefined || keyVal.$lt !== undefined || keyVal.$lte !== undefined) {
                            qry.value = keyVal;
                        }
                        else {
                            qry.value = { $gte: keyVal, $lte: keyVal };
                        }
                    }
                    else {
                        // If keyVal is a direct number, treat it as an exact match
                        qry.value = { $gte: keyVal, $lte: keyVal };
                    }
                }
                else if (defn.unique) {
                    qry.type = 'unique';
                }
                queryParts.push(qry);
            }
            // Now process each part of the query...
            yield bluebird_1.Promise.map(queryParts, (qry) => __awaiter(this, void 0, void 0, function* () {
                const defn = ModelMetaStore_1.ModelMetaStore.getColumn(modelName, qry.key);
                //const val = (defn.parse) ? defn.parse(query.where[key]) : query.where[key];
                if (qry.type == 'numeric') {
                    if (typeof qry.value == 'number') {
                        qry.value = { $gte: qry.value, $lte: qry.value };
                    }
                    results.push(yield indx.searchNumeric(qry.key, qry.value));
                }
                else if (qry.type == 'basic') {
                    results.push(yield indx.search(qry.key, qry.value));
                }
                else if (qry.type == 'unique') {
                    results.push(yield indx.search(qry.key, qry.value));
                }
            }));
            // And get the intersaction of all the results
            let inter = (0, lodash_1.intersection)(...results);
            // Support paging
            if (query.offset && query.limit) {
                inter = (0, lodash_1.slice)(inter, query.offset, query.offset + query.limit);
            }
            else if (query.limit) {
                inter = (0, lodash_1.slice)(inter, 0, query.limit);
            }
            return inter;
        });
    }
}
exports.Model = Model;
//# sourceMappingURL=Model.js.map