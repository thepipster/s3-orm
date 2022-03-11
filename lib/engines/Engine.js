
const Logger = require("../utils/Logger");
const _ = require("lodash");
const ServerS3 = require('./ServerS3');
const Promise = require('bluebird');
const BaseS3Engine = require('./BaseS3Engine');

class Engine extends BaseS3Engine {
    
    constructor(opts){
        super();
        if (!opts){
            opts = {acl:'private'}
        }        
        this.rootPath = process.env.AWS_ROOT_FOLDER;
        this.aws = new ServerS3(opts);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async setObject(key, obj){
        let txt = JSON.stringify(obj);
        //let key = this.__getKey('sets', setName, val);
        await this.aws.uploadString(txt, this.__getKey('hash', key));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObject(key){
        let res = await this.aws.get(this.__getKey('hash', key));
        return JSON.parse(res);
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async delObject(key){
         await this.aws.delete(this.__getKey('hash', key));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async hasObject(key){
        return await this.aws.exists(this.__getKey('hash', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Return a list of objects at the given path. The return keys can be used directly 
     * with getObject.
     * @param {*} path 
     * @returns 
     */
    async listObjects(path){
        let key = this.__getPath('hash', path);
        let root = key.slice()
        let res = await this.aws.list(key);
        return await Promise.map(res, async (item)=>{
            return `${path}/${item.Key.split('/').pop()}`;
            //return JSON.parse(await this.aws.get(item.Key));
        });
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async exists(key){
        return await this.aws.exists(this.__getKey('keyval', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async get(key){
        return await this.aws.get(this.__getKey('keyval', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async list(path, opts){
        let res = await this.aws.list(this.__getPath('keyval', path));
        return _.map(res, (item)=>{
            if (opts && opts.fullPath){
                return item.Key;
            }
            return item.Key.split('/').pop();
        });        
    }        
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    async set(key, val){
        try {
            await this.aws.uploadString(val, this.__getKey('keyval', key));
        }
        catch(err){
            Logger.error(`Tried to set ${val} to ${this.rootPath}${key} and get error ${err.toString()}`);
            process.exit(1);
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async del(key){
        await this.aws.delete(this.__getKey('keyval', key));
    }

    async delBatch(keys){

        if (_.isEmpty(keys)){
            return null;
        }

        let list = _.map(keys, (key)=>{
            return {Key: this.__getKey('keyval', key)}
        });

        Logger.debug('delBatch', list);
        
        await this.aws.deleteAll(list);
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

    /**
     * Add a value into a unordered set
     * @param {string} setName 
     * @param {string} val The value to add to the set
     * @param {string} meta We can also add some meta data associated with this member (S3 only)
     */
    async setAdd(setName, val, meta){   
        if (!meta){
            meta = '';
        }
        //let res = await this.aws.getObjectACL(`${this.rootPath}sets/${setName}`);
        //Logger.warn(res);
        //await this.aws.setObjectACL(`${this.rootPath}sets/${setName}`, 'public-read');    
        await this.aws.uploadString(meta, this.__getKey('sets', setName, val));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Return any meta data associated with a set member
     * @param {string} setName 
     * @param {string} val 
     * @returns 
     */
    async setGetMeta(setName, val){
        return await this.aws.get(this.__getKey('sets', setName, val));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setRemove(setName, val){
        await this.aws.delete(this.__getKey('sets', setName, val));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Clear everything from a set
     * @param {string} setName The set name
     */
    async setClear(setName){
        let items = await this.aws.list(this.__getPath('sets', setName));
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }
    }    

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setIsMember(setName, val){
        try {
            const key = this.__getKey('sets', setName, val);
            return await this.aws.exists(key);
        }
        catch(err){
            return false;
        }
    }
    
	// ///////////////////////////////////////////////////////////////////////////////////////

    async setMembers(setName){        
        let res = await this.aws.list(this.__getPath('sets', setName));
        let list = _.map(res, (item)=>{
            return this._decode(item.Key.split('/').pop());
        });
        return list;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get the intersection of a number of sets
     * @param {array} keys An array of strings, with each string being the key of the set
     */
     async setIntersection(keys){
        let items = await Promise.map(keys, async (setName) => {            
            return this.setMembers(setName);
        });        

        return _.intersection(...items);
    }
    
	// ///////////////////////////////////////////////////////////////////////////////////////

    // zrevrangebyscore, zrangebyscore, zrem

    // ///////////////////////////////////////////////////////////////////////////////////////
        
    /**
     * zadd
     * @param {string} setName 
     * @param {int} score 
     * @param {string} val 
     */
    async zSetAdd(setName, score, val, meta){
        //Logger.debug(`zSetAdd(setName = ${setName}, score = ${score}, val = ${val}, meta = ${meta})`)
        if (meta === false){
            meta = 'false';
        }    
        else if (!meta && meta != 0){
            meta = '';
        }
        let key = this.__getKeyWithScore('zsets', setName, val, score);
        await this.aws.uploadString(meta, key);

    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetRemove(setName, score, val){
        let key = this.__getKeyWithScore('zsets', setName, val, score);
        await this.aws.delete(key);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get tge last item (the max) from the zset as quickly as possible
     * @param {*} setName 
     * @param {*} scores 
     * @returns 
     */
    async zGetMax(setName, scores){

        let key = this.__getKey('zsets', setName)+'/';
        let res = await this.aws.list(key);
        
        let item = res.pop();

        key = item.Key.split('/').pop();
        let parts = key.split('###');
        parts[1] = this._decode(parts[1]);

        if (scores){
            return {
                score: parseInt(parts[0]),
                val: parts[1]
            }    
        }

        return parts[1];

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetMembers(setName, scores){
        
        let key = this.__getPath('zsets', setName);
        //let key = `${this.rootPath}zsets/${setName}/`;
        let res = await this.aws.list(key);

        let list = _.map(res, (item)=>{

            key = item.Key.split('/').pop();
            let parts = key.split('###');
            parts[1] = this._decode(parts[1]);

            if (scores){
                return {
                    score: parseFloat(parts[0]),
                    val: parts[1]
                }    
            }

            return parts[1];
            
        });

        return list;
    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetClear(setName){

        let items = await this.aws.list(this.__getPath('zsets', setName));
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }

        items = await this.aws.list(`${this.__getKey('zsets', setName)}/expires/`);        
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * 
     * @param {*} setName 
     * @param {*} opts gt, gte, lt, lte, limit, order (ASC or DESC), scores
     * @returns 
     */
    async zRange(setName, opts){

        //Logger.debug(`Entering zRange, setName = ${setName}`, opts);

        let res = await this.zSetMembers(setName, true);
    
        if (!opts.$lt && !opts.$lte && !opts.$gt && !opts.$gte){
            throw new Error(`You need to set at least one range specifier ($lt, $lte, $gt, $gte)!`);
        }

        let items = [];

        function isNull(val){
            if (val === 0){
                return false;
            }
            return _.isNull(val) || _.isUndefined(val);
        }

        for (let i=0; i<res.length; i+=1){

            let item = res[i];
            let lowerFlag = false;
            let upperFlag = false;

            if (isNull(opts.$lt) && isNull(opts.$lte)){
                lowerFlag = true;
            }
            if (isNull(opts.$gt) && isNull(opts.$gte)){
                upperFlag = true;
            }

            if (!isNull(opts.$gt) && item.score > opts.$gt){
                upperFlag = true;
            }
            else if (!isNull(opts.$gte) && item.score >= opts.$gte){
                upperFlag = true;
            }

            if (!isNull(opts.$lt) && item.score < opts.$lt){
                lowerFlag = true;
            }
            else if (!isNull(opts.$lte) && item.score <= opts.$lte){
                lowerFlag = true;
            }

            /*
            Logger.debug(`zRange() 
                score = ${item.score}, 
                lowerFlag = ${lowerFlag}, 
                upperFlag = ${upperFlag},                
                $lt = ${(isNull(opts.$lt)) ? 'null' : opts.$lt},
                $lte = ${(isNull(opts.$lte)) ? 'null' : opts.$lte},
                $gt = ${(isNull(opts.$gt)) ? 'null' : opts.$gt},
                $gte = ${(isNull(opts.$gte)) ? 'null' : opts.$gte},
                `);
                */

              

            if (lowerFlag && upperFlag){
                if (opts.score){
                    items.push(item);
                }
                else {
                    items.push(item.val);
                }
            }
        }
        
        if (opts.order && opts.order == 'DESC'){
            items = _.reverse(items);
        }
        
        if (opts.limit){
            items = _.slice(items, 0, opts.limit);
        }

        return items;
    }


}

if(require.main === module) {
    
    require('dotenv-safe').config({});
    const chance = require('chance')();
    const s3 = new Engine();

    setTimeout(async ()=>{

        let list = await s3.setMembers('fish');
        Logger.debug(list);

        /*
        const setName = 'zset-test';
        await s3.zSetClear(setName);

        const no = 25;
        let words = [];
        for (let i=0; i<no; i+=1){
            let word = chance.sentence({ words: 5 }) + '___' + i;
            words.push(word);
            await s3.zSetAdd(setName, i, word);
        }

        let items = await s3.zSetMembers(setName);
        Logger.debug(items);

        let rangeItems = await s3.zRange(setName, {gte:3, lte:6});
        Logger.debug('rangeItems = ', rangeItems);

        await s3.zSetClear(setName);
*/

        //let items2 = await s3.zSetMembers(setName);
        //Logger.warn(items2);


        /*
        const setName = 'fish';
        const word = chance.word();

        Logger.info('Word = ', word);
        await s3.setAdd(setName, word);
        Logger.debug(await s3.setIsMember(setName, word));    
        await s3.setRemove(setName, word);
        Logger.debug(await s3.setIsMember(setName, word));    
        
        */


    }, 100);
   // Logger.debug(EpochUtils.toDayEpoch(new Date('2018-10-19 23:58:24.175+00')))
}
else {
    module.exports = Engine;
}