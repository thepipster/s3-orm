import Logger from "../utils/Logger";
import {reverse, isUndefined, map, isEmpty, intersection, slice} from "lodash";
import {Promise} from "bluebird";
import {S3Helper, type S3Options} from "../services/S3Helper";
import {EngineHelpers} from "./EngineHelpers";
import {Query, callback} from "../types";

export class AwsEngine {
    
    //rootPath: string = 's3orm/';
    aws: S3Helper;

	// ///////////////////////////////////////////////////////////////////////////////////////

    constructor(opts?: S3Options){
        //this.rootPath = (opts.prefix) ? opts.prefix : 's3orm/';
        EngineHelpers.rootPath = (opts.prefix) ? opts.prefix : 's3orm/';
        this.aws = new S3Helper(opts);
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObjectTypes(path: string): Promise<string[]> {
        let res = await this.aws.list(EngineHelpers.getKey('hash'));
        return await Promise.map(res, async (item)=>{
            return `${path}/${item.Key.split('/').pop()}`;
        });        
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async setObject(key: string, obj: any): Promise<void> {
        let txt = '';
        if (typeof obj == 'string'){
            txt = obj;
        }
        else {
            txt = JSON.stringify(obj);
        }         
        //let key = EngineHelpers.getKey('sets', setName, val);
        await this.aws.uploadString(txt, EngineHelpers.getKey('hash', key));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObject(key: string): Promise<any> {
        let res = await this.aws.get(EngineHelpers.getKey('hash', key));
        return JSON.parse(res);
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async delObject(key: string): Promise<void> {
         await this.aws.delete(EngineHelpers.getKey('hash', key));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async hasObject(key: string): Promise<boolean> {
        return await this.aws.exists(EngineHelpers.getKey('hash', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Return a list of objects at the given path. The return keys can be used directly 
     * with getObject.
     * @param {*} path 
     * @returns 
     */
    async listObjects(path: string): Promise<string[]> {
        let key = EngineHelpers.getPath('hash', path);
        let res = await this.aws.list(key);
        return await Promise.map(res, async (item)=>{
            return `${path}/${item.Key.split('/').pop()}`;
            //return JSON.parse(await this.aws.get(item.Key));
        });
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async exists(key: string): Promise<boolean> {
        return await this.aws.exists(EngineHelpers.getKey('keyval', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async get(key: string): Promise<string> {
        return await this.aws.get(EngineHelpers.getKey('keyval', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async list(path: string, opts: {fullPath?: boolean} = {}): Promise<string[]> {
        let res = await this.aws.list(EngineHelpers.getPath('keyval', path));
        return map(res, (item: any)=>{
            if (opts && opts.fullPath){
                return item.Key;
            }
            return item.Key.split('/').pop();
        });        
    }        
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    async set(key: string, val: string): Promise<void> {
        try {
            await this.aws.uploadString(val, EngineHelpers.getKey('keyval', key));
        }
        catch(err){
            Logger.error(`Tried to set ${val} to ${key} and get error ${err.toString()}`);
            process.exit(1);
        }
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async del(key: string): Promise<void> {
        await this.aws.delete(EngineHelpers.getKey('keyval', key));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async delBatch(keys: string[]): Promise<void> {

        if (isEmpty(keys)){
            return null;
        }

        let list = map(keys, (key)=>{
            return {Key: EngineHelpers.getKey('keyval', key)}
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
    async setAdd(setName: string, val: string, meta: string = ''): Promise<void> {   
        //let res = await this.aws.getObjectACL(`${this.rootPath}sets/${setName}`);
        //Logger.warn(res);
        //await this.aws.setObjectACL(`${this.rootPath}sets/${setName}`, 'public-read');    
        await this.aws.uploadString(meta, EngineHelpers.getKey('sets', setName, val));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Return any meta data associated with a set member
     * @param {string} setName 
     * @param {string} val 
     * @returns 
     */
    async setGetMeta(setName: string, val: string): Promise<string> {
        return await this.aws.get(EngineHelpers.getKey('sets', setName, val));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setRemove(setName: string, val: string): Promise<void> {
        await this.aws.delete(EngineHelpers.getKey('sets', setName, val));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Clear everything from a set
     * @param {string} setName The set name
     */
    async setClear(setName: string): Promise<void> {
        let items = await this.aws.list(EngineHelpers.getPath('sets', setName));
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }
    }    

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setIsMember(setName: string, val: string): Promise<boolean> {
        try {
            const key = EngineHelpers.getKey('sets', setName, val);
            return await this.aws.exists(key);
        }
        catch(err){
            return false;
        }
    }
    
	// ///////////////////////////////////////////////////////////////////////////////////////

    async setMembers(setName: string): Promise<string[]> {        
        let res = await this.aws.list(EngineHelpers.getPath('sets', setName));
        let list = map(res, (item: any)=>{
            return EngineHelpers.decode(item.Key.split('/').pop());
        });
        return list;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get the intersection of a number of sets
     * @param {array} keys An array of strings, with each string being the key of the set
     */
     async setIntersection(keys: string[]): Promise<string[]> {
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
     * @param {string} setName The column field name
     * @param {int} score The score to add (the value to sort by)
     * @param {string} val The value to add to the set (typically the record id)
     */
    async zSetAdd(setName: string, score: number, val: string, meta: string | boolean = ''): Promise<void> {
        //Logger.debug(`zSetAdd(setName = ${setName}, score = ${score}, val = ${val}, meta = ${meta})`)
        if (meta === false){
            meta = 'false';
        }    
        else if (!meta){
            meta = '';
        }
        let key = EngineHelpers.getKeyWithScore('zsets', setName, val, score);
        await this.aws.uploadString(meta as string, key);

    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetRemove(setName: string, score: number, val: string): Promise<void> {
        let key = EngineHelpers.getKeyWithScore('zsets', setName, val, score);
        await this.aws.delete(key);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get tge last item (the max) from the zset as quickly as possible
     * @param {*} setName 
     * @param {*} scores 
     * @returns 
     */
    async zGetMax(setName: string, scores?: boolean): Promise<string | {score: number, val: string}> {
        
        let key = EngineHelpers.getKey('zsets', setName)+'/';
        let res = await this.aws.list(key);        
        let item:any = res.pop();

        key = item.Key.split('/').pop();
        let parts = key.split('###');

        parts[1] = EngineHelpers.decode(parts[1]);

        //Logger.debug(`zGetMax() parts = `, parts);
        if (scores){
            return {
                score: parseInt(parts[0]),
                val: parts[1]
            }    
        }

        return parts[1];

    }

    async zGetMin(setName: string, scores?: boolean): Promise<string | {score: number, val: string}> {
        
        let key = EngineHelpers.getKey('zsets', setName)+'/';
        let res = await this.aws.list(key);        
        let item:any = res[0];

        key = item.Key.split('/').pop();
        let parts = key.split('###');

        parts[1] = EngineHelpers.decode(parts[1]);

        //Logger.debug(`zGetMin() parts = `, parts);
        if (scores){
            return {
                score: parseInt(parts[0]),
                val: parts[1]
            }    
        }

        return parts[1];

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetMembers(setName: string, scores?: boolean): Promise<Array<string | {score: number, val: string}>> {
        
        let key = EngineHelpers.getPath('zsets', setName);
        //let key = `${this.rootPath}zsets/${setName}/`;
        let res = await this.aws.list(key);

        let list = map(res, (item: any)=>{

            key = item.Key.split('/').pop();
            let parts = key.split('###');
            parts[1] = EngineHelpers.decode(parts[1]);

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

    async zSetClear(setName: string): Promise<void> {
        let items = await this.aws.list(EngineHelpers.getPath('zsets', setName));
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }

        items = await this.aws.list(`${EngineHelpers.getKey('zsets', setName)}/expires/`);        
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
    async zRange(setName: string, opts: Query): Promise<Array<{score: number, val: string}>> {
        
        //Logger.debug(`Entering zRange, setName = ${setName}`, opts);

        let res = await this.zSetMembers(setName, true) as Array<{score: number, val: string}>;
    
        if (!opts['$lt'] && !opts['$lte'] && !opts['$gt'] && !opts['$gte']){
            throw new Error(`You need to set at least one range specifier ($lt, $lte, $gt, $gte)!`);
        }

        let items = [];

        function isNull(val: any): boolean {
            if (val === 0) {
                return false;
            }
            return val === null || val === undefined;
        }

        for (let i=0; i<res.length; i+=1){

            let item = res[i];
            let lowerFlag = false;
            let upperFlag = false;

            if (isNull(opts['$lt']) && isNull(opts['$lte'])){
                lowerFlag = true;
            }
            if (isNull(opts['$gt']) && isNull(opts['$gte'])){
                upperFlag = true;
            }

            if (!isNull(opts['$gt']) && item.score > opts['$gt']){
                upperFlag = true;
            }
            else if (!isNull(opts['$gte']) && item.score >= opts['$gte']){
                upperFlag = true;
            }

            if (!isNull(opts['$lt']) && item.score < opts['$lt']){
                lowerFlag = true;
            }
            else if (!isNull(opts['$lte']) && item.score <= opts['$lte']){
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

              

            if (lowerFlag && upperFlag){
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
    }


}
