
import Logger from "../utils/Logger";
import {reverse, isUndefined, map, isEmpty, intersection, slice} from "lodash";
import Promise from "bluebird";
import S3Helper from "../services/S3Helper";
import BaseS3Engine from "./BaseS3Engine";

class AwsEngine extends BaseS3Engine {
    
    constructor(opts){
        super();      
        this.rootPath = (opts.prefix) ? opts.prefix : 's3orm/';
        this.aws = new S3Helper(opts);
        this.url = this.aws.rootUrl;        
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObjecTypes(){
        let res = await this.aws.list(this.__getKey('hash'));
        Logger.debug('Listing from ', this.__getKey('hash'));
        Logger.debug(res);
        return await Promise.map(res, async (item)=>{
            return `${path}/${item.Key.split('/').pop()}`;
        });        
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
        return map(res, (item)=>{
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

    // ///////////////////////////////////////////////////////////////////////////////////////

    async delBatch(keys){

        if (isEmpty(keys)){
            return null;
        }

        let list = map(keys, (key)=>{
            return {Key: this.__getKey('keyval', key)}
        });

        //Logger.debug('delBatch', list);
        
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
        let list = map(res, (item)=>{
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

        return intersection(...items);
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

        let list = map(res, (item)=>{

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
            return isNull(val) || isUndefined(val);
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
            items = reverse(items);
        }
        
        if (opts.limit){
            items = slice(items, 0, opts.limit);
        }

        return items;
    }


}

export default AwsEngine;
