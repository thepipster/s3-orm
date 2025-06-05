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
exports.AwsEngine2 = void 0;
const Logger_1 = __importDefault(require("../utils/Logger"));
const lodash_1 = require("lodash");
const bluebird_1 = require("bluebird");
const S3Helper_1 = require("../services/S3Helper");
const EngineHelpers_1 = require("./EngineHelpers");
class AwsEngine2 {
    // ///////////////////////////////////////////////////////////////////////////////////////
    constructor(opts) {
        this.setCache = new Map();
        EngineHelpers_1.EngineHelpers.rootPath = (opts.prefix) ? opts.prefix : 's3orm/';
        this.aws = new S3Helper_1.S3Helper(opts);
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    getObjectTypes(path) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.aws.list(EngineHelpers_1.EngineHelpers.getKey('hash'));
            return yield bluebird_1.Promise.map(res, (item) => __awaiter(this, void 0, void 0, function* () {
                return `${path}/${item.Key.split('/').pop()}`;
            }));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    setObject(key, obj) {
        return __awaiter(this, void 0, void 0, function* () {
            let txt = '';
            if (typeof obj == 'string') {
                txt = obj;
            }
            else {
                txt = JSON.stringify(obj);
            }
            //let key = EngineHelpers.getKey('sets', setName, val);
            yield this.aws.uploadString(txt, EngineHelpers_1.EngineHelpers.getKey('hash', key));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    getObject(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.aws.get(EngineHelpers_1.EngineHelpers.getKey('hash', key));
            return JSON.parse(res);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    delObject(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.aws.delete(EngineHelpers_1.EngineHelpers.getKey('hash', key));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    hasObject(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.aws.exists(EngineHelpers_1.EngineHelpers.getKey('hash', key));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Return a list of objects at the given path. The return keys can be used directly
     * with getObject.
     * @param {*} path
     * @returns
     */
    listObjects(path) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = EngineHelpers_1.EngineHelpers.getPath('hash', path);
            let res = yield this.aws.list(key);
            return yield bluebird_1.Promise.map(res, (item) => __awaiter(this, void 0, void 0, function* () {
                return `${path}/${item.Key.split('/').pop()}`;
                //return JSON.parse(await this.aws.get(item.Key));
            }));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    exists(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.aws.exists(EngineHelpers_1.EngineHelpers.getKey('keyval', key));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.aws.get(EngineHelpers_1.EngineHelpers.getKey('keyval', key));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    list(path_1) {
        return __awaiter(this, arguments, void 0, function* (path, opts = {}) {
            let res = yield this.aws.list(EngineHelpers_1.EngineHelpers.getPath('keyval', path));
            return (0, lodash_1.map)(res, (item) => {
                if (opts && opts.fullPath) {
                    return item.Key;
                }
                return item.Key.split('/').pop();
            });
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    set(key, val) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.aws.uploadString(val, EngineHelpers_1.EngineHelpers.getKey('keyval', key));
            }
            catch (err) {
                Logger_1.default.error(`Tried to set ${val} to ${key} and get error ${err.toString()}`);
                process.exit(1);
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.aws.delete(EngineHelpers_1.EngineHelpers.getKey('keyval', key));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    delBatch(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((0, lodash_1.isEmpty)(keys)) {
                return null;
            }
            let list = (0, lodash_1.map)(keys, (key) => {
                return { Key: EngineHelpers_1.EngineHelpers.getKey('keyval', key) };
            });
            //Logger.debug('delBatch', list);
            yield this.aws.deleteAll(list);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * If your bucket is not set for public read access, you can call this to set ready
     * just on the folders used by this
     */
    //async setupReadPermissions(){
    //    await this.aws.setFolderPublicRead('s3orm');
    // }
    // ///////////////////////////////////////////////////////////////////////////////////////
    _loadSet(setName) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = yield this.getObject(EngineHelpers_1.EngineHelpers.getKey('set-hashes', setName));
            this.setCache.set(setName, data);
        });
    }
    /**
     * Add a value into a unordered set
     * @param {string} setName
     * @param {string} val The value to add to the set
     * @param {string} meta We can also add some meta data associated with this member (S3 only)
     */
    setAdd(setName_1, val_1) {
        return __awaiter(this, arguments, void 0, function* (setName, val, meta = '') {
            //let res = await this.aws.getObjectACL(`${this.rootPath}sets/${setName}`);
            //Logger.warn(res);
            //await this.aws.setObjectACL(`${this.rootPath}sets/${setName}`, 'public-read');    
            if (!this.setCache.has(setName)) {
                // We need to read this set into memory
                yield this._loadSet(setName);
            }
            this.setCache.get(setName).push({ setName, val, meta });
            yield this.aws.uploadString(meta, EngineHelpers_1.EngineHelpers.getKey('sets', setName, val));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Return any meta data associated with a set member
     * @param {string} setName
     * @param {string} val
     * @returns
     */
    setGetMeta(setName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.aws.get(EngineHelpers_1.EngineHelpers.getKey('sets', setName, val));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    setRemove(setName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.aws.delete(EngineHelpers_1.EngineHelpers.getKey('sets', setName, val));
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Clear everything from a set
     * @param {string} setName The set name
     */
    setClear(setName) {
        return __awaiter(this, void 0, void 0, function* () {
            let items = yield this.aws.list(EngineHelpers_1.EngineHelpers.getPath('sets', setName));
            if (items && items.length > 0) {
                yield this.aws.deleteAll(items);
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    setIsMember(setName, val) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const key = EngineHelpers_1.EngineHelpers.getKey('sets', setName, val);
                return yield this.aws.exists(key);
            }
            catch (err) {
                return false;
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    setMembers(setName) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.aws.list(EngineHelpers_1.EngineHelpers.getPath('sets', setName));
            let list = (0, lodash_1.map)(res, (item) => {
                return EngineHelpers_1.EngineHelpers.decode(item.Key.split('/').pop());
            });
            return list;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Get the intersection of a number of sets
     * @param {array} keys An array of strings, with each string being the key of the set
     */
    setIntersection(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            let items = yield bluebird_1.Promise.map(keys, (setName) => __awaiter(this, void 0, void 0, function* () {
                return this.setMembers(setName);
            }));
            return (0, lodash_1.intersection)(...items);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    // zrevrangebyscore, zrangebyscore, zrem
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * zadd
     * @param {string} setName The column field name
     * @param {int} score The score to add (the value to sort by)
     * @param {string} val The value to add to the set (typically the record id)
     */
    zSetAdd(setName_1, score_1, val_1) {
        return __awaiter(this, arguments, void 0, function* (setName, score, val, meta = '') {
            //Logger.debug(`zSetAdd(setName = ${setName}, score = ${score}, val = ${val}, meta = ${meta})`)
            if (meta === false) {
                meta = 'false';
            }
            else if (!meta) {
                meta = '';
            }
            let key = EngineHelpers_1.EngineHelpers.getKeyWithScore('zsets', setName, val, score);
            yield this.aws.uploadString(meta, key);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    zSetRemove(setName, score, val) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = EngineHelpers_1.EngineHelpers.getKeyWithScore('zsets', setName, val, score);
            yield this.aws.delete(key);
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     * Get tge last item (the max) from the zset as quickly as possible
     * @param {*} setName
     * @param {*} scores
     * @returns
     */
    zGetMax(setName, scores) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = EngineHelpers_1.EngineHelpers.getKey('zsets', setName) + '/';
            let res = yield this.aws.list(key);
            let item = res.pop();
            key = item.Key.split('/').pop();
            let parts = key.split('###');
            parts[1] = EngineHelpers_1.EngineHelpers.decode(parts[1]);
            //Logger.debug(`zGetMax() parts = `, parts);
            if (scores) {
                return {
                    score: parseInt(parts[0]),
                    val: parts[1]
                };
            }
            return parts[1];
        });
    }
    zGetMin(setName, scores) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = EngineHelpers_1.EngineHelpers.getKey('zsets', setName) + '/';
            let res = yield this.aws.list(key);
            let item = res[0];
            key = item.Key.split('/').pop();
            let parts = key.split('###');
            parts[1] = EngineHelpers_1.EngineHelpers.decode(parts[1]);
            //Logger.debug(`zGetMin() parts = `, parts);
            if (scores) {
                return {
                    score: parseInt(parts[0]),
                    val: parts[1]
                };
            }
            return parts[1];
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    zSetMembers(setName, scores) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = EngineHelpers_1.EngineHelpers.getPath('zsets', setName);
            //let key = `${this.rootPath}zsets/${setName}/`;
            let res = yield this.aws.list(key);
            let list = (0, lodash_1.map)(res, (item) => {
                key = item.Key.split('/').pop();
                let parts = key.split('###');
                parts[1] = EngineHelpers_1.EngineHelpers.decode(parts[1]);
                if (scores) {
                    return {
                        score: parseFloat(parts[0]),
                        val: parts[1]
                    };
                }
                return parts[1];
            });
            return list;
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    zSetClear(setName) {
        return __awaiter(this, void 0, void 0, function* () {
            let items = yield this.aws.list(EngineHelpers_1.EngineHelpers.getPath('zsets', setName));
            if (items && items.length > 0) {
                yield this.aws.deleteAll(items);
            }
            items = yield this.aws.list(`${EngineHelpers_1.EngineHelpers.getKey('zsets', setName)}/expires/`);
            if (items && items.length > 0) {
                yield this.aws.deleteAll(items);
            }
        });
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    /**
     *
     * @param {*} setName
     * @param {*} opts gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns
     */
    zRange(setName, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            //Logger.debug(`Entering zRange, setName = ${setName}`, opts);
            let res = yield this.zSetMembers(setName, true);
            if (!opts['$lt'] && !opts['$lte'] && !opts['$gt'] && !opts['$gte']) {
                throw new Error(`You need to set at least one range specifier ($lt, $lte, $gt, $gte)!`);
            }
            let items = [];
            function isNull(val) {
                if (val === 0) {
                    return false;
                }
                return val === null || val === undefined;
            }
            for (let i = 0; i < res.length; i += 1) {
                let item = res[i];
                let lowerFlag = false;
                let upperFlag = false;
                if (isNull(opts['$lt']) && isNull(opts['$lte'])) {
                    lowerFlag = true;
                }
                if (isNull(opts['$gt']) && isNull(opts['$gte'])) {
                    upperFlag = true;
                }
                if (!isNull(opts['$gt']) && item.score > opts['$gt']) {
                    upperFlag = true;
                }
                else if (!isNull(opts['$gte']) && item.score >= opts['$gte']) {
                    upperFlag = true;
                }
                if (!isNull(opts['$lt']) && item.score < opts['$lt']) {
                    lowerFlag = true;
                }
                else if (!isNull(opts['$lte']) && item.score <= opts['$lte']) {
                    lowerFlag = true;
                }
                /*
                Logger.debug(`zRange()
                    score = ${item.score},
                    lowerFlag = ${lowerFlag},
                    upperFlag = ${upperFlag},
                    $lt = ${(isNull(opts['$lt'])) ? 'null' : opts['$lt']},
                    $lte = ${(isNull(opts['$lte'])) ? 'null' : opts['$lte']},
                    $gt = ${(isNull(opts['$gt'])) ? 'null' : opts['$gt']},
                    $gte = ${(isNull(opts['$gte'])) ? 'null' : opts['$gte']},
                    `);
                    */
                if (lowerFlag && upperFlag) {
                    items.push(item);
                }
            }
            /*
            if (opts.order && opts.order == 'DESC'){
                items = reverse(items);
            }
            
            if (opts.limit){
                items = slice(items, 0, opts.limit);
            }
                */
            return items;
        });
    }
}
exports.AwsEngine2 = AwsEngine2;
//# sourceMappingURL=AwsEngine2.js.map