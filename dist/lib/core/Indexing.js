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
exports.Indexing = void 0;
const Logger_1 = __importDefault(require("../utils/Logger"));
const EngineHelpers_1 = require("./EngineHelpers");
const Stash_1 = require("./Stash");
const ModelMetaStore_1 = require("../decorators/ModelMetaStore");
const lodash_1 = require("lodash");
const bluebird_1 = require("bluebird");
const UniqueKeyViolationError_1 = __importDefault(require("../errors/UniqueKeyViolationError"));
class Indexing {
    // ///////////////////////////////////////////////////////////////////////////////////////
    constructor(id, modelName) {
        this.id = 0;
        this.schema = {};
        this.modelName = "";
        this.id = id;
        this.schema = ModelMetaStore_1.ModelMetaStore.get(modelName);
        this.modelName = modelName;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    _checkKey(key) {
        //Logger.error(key, this.schema.hasOwnProperty(key));
        //Logger.error(Object.keys(this.schema));
        if (!ModelMetaStore_1.ModelMetaStore.hasColumn(this.modelName, key)) {
            throw new Error(`The schema does not have a field called ${key}!`);
        }
        const fieldDef = ModelMetaStore_1.ModelMetaStore.getColumn(this.modelName, key);
        //const fieldDef: ColumnSchema = ModelMetaStore.getColumn(this.modelName, key);
        if (!fieldDef.index && !fieldDef.unique) {
            throw new Error(`The schema field ${key} does not have an index!`);
        }
        return fieldDef;
    }
    _isNull(val) {
        return (0, lodash_1.isNull)(val) || (0, lodash_1.isUndefined)(val) || val == '';
    }
    //stringify(key: string, val: any){
    //    const fieldDef: ColumnSchema = this._checkKey(key);
    //    return fieldDef.encode(val);
    //}
    //parse(key: string, val: string){
    //    const fieldDef: ColumnSchema = this._checkKey(key);
    //    return fieldDef.decode(val);
    //}    
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     *
     * @param {*} fieldName
     * @param {*} val
     * @returns
     */
    isMemberUniques(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isNull(val)) {
                throw new Error(`The value must be a string!`);
            }
            const fieldDef = this._checkKey(fieldName);
            val = fieldDef.encode(val);
            const key = this.getIndexName(this.modelName, fieldName);
            let alreadyExistsId = yield Stash_1.Stash.s3().setIsMember(key, val);
            // Throw error if this val already exists in the set
            if (alreadyExistsId) {
                return true;
            }
            return false;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    clearUniques(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            this._checkKey(fieldName);
            return yield Stash_1.Stash.s3().setClear(this.getIndexName(this.modelName, fieldName));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    getUniques(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            this._checkKey(fieldName);
            return yield Stash_1.Stash.s3().setMembers(this.getIndexName(this.modelName, fieldName));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    removeUnique(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldDef = this._checkKey(fieldName);
            val = fieldDef.encode(val);
            yield Stash_1.Stash.s3().setRemove(this.getIndexName(this.modelName, fieldName), val);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    addUnique(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            if (val == undefined || val == null || val == '') {
                throw new Error(`Can't add an empty or null value as a unique key!`);
            }
            const fieldDef = this._checkKey(fieldName);
            val = fieldDef.encode(val);
            const key = this.getIndexName(this.modelName, fieldName);
            let alreadyExistsId = yield Stash_1.Stash.s3().setIsMember(key, val);
            // Throw error if this val already exists in the set
            if (alreadyExistsId) {
                throw new UniqueKeyViolationError_1.default(`${fieldName} = ${val} is unique, and already exists`);
            }
            //return await this.add(fieldName, val);
            yield Stash_1.Stash.s3().setAdd(this.getIndexName(this.modelName, fieldName), val);
            return;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Remove a simple index
     * @param {*} fieldName
     * @param {*} val
     */
    remove(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isNull(val)) {
                return;
            }
            const fieldDef = this._checkKey(fieldName);
            val = fieldDef.encode(val);
            const key = `${this.getIndexName(this.modelName, fieldName)}/${EngineHelpers_1.EngineHelpers.encode(val)}###${this.id}`;
            yield Stash_1.Stash.s3().del(key);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Add a simple index for a value
     * @param {*} fieldName
     * @param {*} val
     */
    add(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isNull(val)) {
                return;
            }
            const fieldDef = this._checkKey(fieldName);
            val = fieldDef.encode(val);
            const key = `${this.getIndexName(this.modelName, fieldName)}/${EngineHelpers_1.EngineHelpers.encode(val)}###${this.id}`;
            yield Stash_1.Stash.s3().set(key, val);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Get all the basic (string) index values for the given fieldName
     * @param {*} fieldName
     * @returns
     */
    list(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldDef = this._checkKey(fieldName);
            let res = yield Stash_1.Stash.s3().list(this.getIndexName(this.modelName, fieldName));
            return (0, lodash_1.map)(res, (item) => {
                let parts = item.split('###');
                const decodedValue = EngineHelpers_1.EngineHelpers.decode(parts[0]);
                return {
                    //val: this.parse(fieldName, decodedValue), 
                    val: fieldDef.decode(decodedValue),
                    id: parseInt(parts[1])
                };
            });
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Clear the entire index for the given fieldName
     * @param {*} fieldName
     * @returns Number of items removed
     */
    clear(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldDef = this._checkKey(fieldName);
            let deleteBatch = [];
            let res = yield this.list(fieldName);
            for (let i = 0; i < res.length; i += 1) {
                let item = res[i];
                let key = `${this.getIndexName(this.modelName, fieldName)}/${EngineHelpers_1.EngineHelpers.encode(item.val)}###${item.id}`;
                deleteBatch.push(key);
            }
            yield Stash_1.Stash.s3().delBatch(deleteBatch);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Perform a search on a basic (string) index
     * @param {*} fieldName
     * @param {*} searchVal
     * @returns
     */
    search(fieldName, searchVal) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldDef = this._checkKey(fieldName);
            /*
            function equalsIgnoringCase(text, other) {
                if (!text){
                    return false;
                }
                let test = text.localeCompare(other, undefined, { sensitivity: 'base' }) === 0;
                Logger.debug(`search() Comparing ${text} against ${other} -- match = ${test}`)
    
            }
            */
            searchVal = fieldDef.encode(searchVal);
            if (!searchVal || typeof searchVal != 'string') {
                Logger_1.default.warn(`Indexing.sarch() ${fieldName} = ${searchVal} is not a string`);
                return;
            }
            searchVal = searchVal.toLowerCase();
            let res = yield this.list(fieldName);
            let list = [];
            (0, lodash_1.map)(res, (item) => {
                if (item.val) {
                    //Logger.debug(`search() Comparing ${item.val} against ${searchVal} -- match = ${test}`)
                    //if (equalsIgnoringCase(item.val, searchVal)){
                    if (item.val.toLowerCase().includes(searchVal)) {
                        list.push(item.id);
                    }
                }
            });
            return (0, lodash_1.uniq)(list);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    getNumerics(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            this._checkKey(fieldName);
            return yield Stash_1.Stash.s3().zSetMembers(this.getIndexName(this.modelName, fieldName), true);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    clearNumerics(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            this._checkKey(fieldName);
            return yield Stash_1.Stash.s3().zSetClear(this.getIndexName(this.modelName, fieldName));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    addNumeric(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isNull(val)) {
                return;
            }
            const fieldDef = this._checkKey(fieldName);
            const numericVal = Number(val);
            if (isNaN(numericVal)) {
                throw new Error(`Invalid numeric value for field ${fieldName}: ${val}`);
            }
            try {
                yield Stash_1.Stash.s3().zSetAdd(this.getIndexName(this.modelName, fieldName), numericVal, this.id.toString());
            }
            catch (err) {
                Logger_1.default.error(err);
                throw new Error(`Error setting numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`);
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    removeNumeric(fieldName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isNull(val)) {
                return;
            }
            const fieldDef = this._checkKey(fieldName);
            const numericVal = Number(val);
            if (isNaN(numericVal)) {
                throw new Error(`Invalid numeric value for field ${fieldName}: ${val}`);
            }
            try {
                yield Stash_1.Stash.s3().zSetRemove(this.getIndexName(this.modelName, fieldName), numericVal, this.id.toString());
            }
            catch (err) {
                Logger_1.default.error(err.encode());
                throw new Error(`Error removing numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`);
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Search on a numeric index, returning an array of id's that match the query
     * @param {string} fieldName
     * @param {object} query gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns
     */
    searchNumeric(fieldName, query) {
        return __awaiter(this, void 0, void 0, function* () {
            this._checkKey(fieldName);
            let res = yield Stash_1.Stash.s3().zRange(this.getIndexName(this.modelName, fieldName), query);
            if (!res) {
                return [];
            }
            return (0, lodash_1.map)(res, (item) => {
                return item.val;
            });
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    getIndexName(modelName, fieldName = null) {
        if (fieldName) {
            return `${modelName}/${fieldName}`;
        }
        return `${modelName}`;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * As tracking the last id used for models is used a lot (when we create a new model instance)
     * it makes sense to cache id's as a special case
     */
    setMaxId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Stash_1.Stash.s3().set(`${this.getIndexName(this.modelName)}/maxid`, id + '');
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    getMaxId() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let val = yield Stash_1.Stash.s3().get(`${this.getIndexName(this.modelName)}/maxid`);
                let no = parseInt(val);
                //Logger.debug(`getMaxId() = Read ${val}, parsed = ${no}, isNumber(no) = ${isNumber(no)}, isFinite(no) = ${isFinite(no)}`);
                if (!(0, lodash_1.isNumber)(no) || !(0, lodash_1.isFinite)(no)) {
                    return 0;
                }
                return no;
            }
            catch (err) {
                //Logger.error(err);
                return 0;
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    removeIndexForField(key, val) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldDef = ModelMetaStore_1.ModelMetaStore.getColumn(this.modelName, key);
            // If this field is not indexed, just return now
            if (!fieldDef.index && !fieldDef.unique) {
                return;
            }
            const isNull = this._isNull(val);
            //Logger.info(`Removing index for ${chalk.default.cyan(key)};
            //    val ${val},
            //    prevVal ${prevVal},
            //    unique ${chalk.default.blueBright(fieldDef.unique)},
            //    isNumeric ${chalk.default.blueBright(fieldDef.type.isNumeric)},
            //    isInDb ${chalk.default.blueBright(fieldDef.isInDb)},
            //    index ${chalk.default.blueBright(fieldDef.index)},
            //    id ${this.id}`);
            if (isNull) {
                return;
            }
            try {
                if (fieldDef.unique) {
                    yield this.removeUnique(key, val);
                }
                if (fieldDef.isNumeric) {
                    yield this.removeNumeric(key, val);
                }
                else {
                    yield this.remove(key, val);
                }
            }
            catch (err) {
                //Logger.error(`Error removing index for ${chalk.default.cyan(key)};
                //    val ${val},
                //    prevVal ${prevVal},
                //    unique ${chalk.default.blueBright(fieldDef.unique)},
                //    isNumeric ${chalk.default.blueBright(fieldDef.type.isNumeric)},
                //    isInDb ${chalk.default.blueBright(fieldDef.isInDb)},
                //    index ${chalk.default.blueBright(fieldDef.index)},
                //    id ${this.id}`);
                Logger_1.default.error(err);
                //process.exit(1);
                throw err;
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    setIndexForField(key, val, oldVal) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldDef = ModelMetaStore_1.ModelMetaStore.getColumn(this.modelName, key);
            // If this field is not indexed, just return now
            if (!fieldDef.index && !fieldDef.unique) {
                return;
            }
            if (!this.id) {
                throw new Error(`The id has not been set, can not index without it!`);
            }
            const isNull = this._isNull(val);
            const isInDb = !this._isNull(oldVal);
            const isDirty = !isInDb || (val !== oldVal);
            // If it's not dirty (unchanged), then nothing to be done
            if (!isDirty) {
                //Logger.info(`Skipping index for ${chalk.default.cyan(key)} (it's not dirty)`);
                return;
            }
            yield this.removeIndexForField(key, oldVal);
            if (isNull) {
                return;
            }
            /*
            Logger.info(`Setting index for ${chalk.default.cyan(key)};
                val ${val},
                oldVal ${oldVal},
                unique ${chalk.default.blueBright(fieldDef.unique)},
                isNull ${isNull},
                isNumeric ${chalk.default.blueBright(fieldDef.type.isNumeric)},
                isInDb ${chalk.default.blueBright(fieldDef.isInDb)},
                index ${chalk.default.blueBright(fieldDef.index)},
            `);
            */
            if (fieldDef.unique) {
                //await this.addUnique(key, val);
                // If the index is unique, and already exists, return            
                yield this.addUnique(key, val);
            }
            if (fieldDef.isNumeric && !isNull) {
                yield this.addNumeric(key, val);
            }
            else {
                yield this.add(key, val);
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Loop through the indices for this model, and reset. That is, make
     * sure they are correct and aren't corrupt
     */
    cleanIndices() {
        return __awaiter(this, void 0, void 0, function* () {
            // List all objects from their hashes
            let keys = yield Stash_1.Stash.s3().listObjects(this.modelName);
            // Clean all the indexes for this  model
            yield Stash_1.Stash.s3().zSetClear(this.modelName);
            yield Stash_1.Stash.s3().setClear(this.modelName);
            // Get basic indexes
            let fieldNames = Object.keys(this.schema);
            let deleteBatch = [];
            for (let i = 0; i < keys.length; i += 1) {
                let key = keys[i];
                //Logger.debug(`Deleting ${key} (${i+1} of ${keys.length})`);
                yield bluebird_1.Promise.map(fieldNames, (fieldName) => __awaiter(this, void 0, void 0, function* () {
                    let res = yield Stash_1.Stash.s3().list(this.getIndexName(this.modelName, fieldName));
                    for (let k = 0; k < res.length; k += 1) {
                        const item = res[k];
                        const dkey = `${this.getIndexName(this.modelName, fieldName)}/${item}`;
                        deleteBatch.push(dkey);
                    }
                }), { concurrency: 10 });
            }
            yield Stash_1.Stash.s3().delBatch(deleteBatch);
            // TODO: Explore, to make faster...
            // Stash.s3().aws.deleteAll(items);
            let maxId = -9999;
            yield bluebird_1.Promise.map(keys, (key) => __awaiter(this, void 0, void 0, function* () {
                let data = yield Stash_1.Stash.s3().getObject(key);
                if (data.id > maxId) {
                    maxId = data.id;
                }
                // Set new indexes
                for (let j = 0; j < fieldNames.length; j += 1) {
                    let fieldName = fieldNames[j];
                    this.id = data.id;
                    this.setIndexForField(fieldName, this.schema[fieldName], data[fieldName]);
                }
            }), { concurrency: 10 });
            // Set max id correctly
            yield this.setMaxId(maxId);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Add a expire index, that will expire the entire model instance
     * @param {integer} expireTime Seconds in the future that this will expire
     */
    addExpires(expireTime) {
        return __awaiter(this, void 0, void 0, function* () {
            let expires = Math.round(Date.now() / 1000) + expireTime;
            yield Stash_1.Stash.s3().zSetAdd(`${this.getIndexName(this.modelName)}/expires`, expires, this.id + '', this.id + '');
        });
    }
}
exports.Indexing = Indexing;
//# sourceMappingURL=Indexing.js.map