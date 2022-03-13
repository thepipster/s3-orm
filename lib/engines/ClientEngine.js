
const Logger = require("../utils/Logger");
const _ = require("lodash");
const Promise = require('bluebird');
const ClientS3 = require('../services/ClientS3');
const BaseS3Engine = require('./BaseS3Engine');

class ClientEngine extends BaseS3Engine {
    
    constructor(rootUrl){
        super();
        if (!rootUrl){
            rootUrl = process.env.AWS_CLOUDFRONT_URL;
        }
        this.url = rootUrl;
        this.rootPath = process.env.AWS_ROOT_FOLDER;
        this.aws = new ClientS3(rootUrl);
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setIsMember(setName, val){
        return await this.aws.exists(this.__getKey('sets', setName, val));
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

    async getSetItem(setName, key){
        return await this.aws.get(this.__getKey('sets', setName, key));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObject(id){        
        let res = await this.aws.get(this.__getKey('hash', id));
        return JSON.parse(res);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetMembers(setName, scores){
        
        let key = this.__getPath('zsets', setName);
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

    // ///////////////////////////////////////////////////////////////////////////////////////

    async get(key){
        return await this.aws.get(`${this.rootPath}/${key}`);
    }

}

if(require.main === module) {
    
    require('dotenv-safe').config({});
    const Engine = require('./Engine');
    const chance = require('chance')();
    const s3Client = new ClientEngine();
    const s3 = new Engine({acl:'public-read'});

    setTimeout(async ()=>{



 
        const setName = 'zset-test';
        await s3.zSetClear(setName);

        const no = 25;
        let words = [];
        for (let i=0; i<no; i+=1){
            let word = chance.sentence({ words: 5 }) + '___' + i;
            words.push(word);
            await s3.zSetAdd(setName, i, word);
        }

        let items = await s3Client.zSetMembers(setName);
        Logger.debug(items);

        let rangeItems = await s3Client.zRange(setName, {gte:3, lte:6});
        Logger.debug('rangeItems = ', rangeItems);

        //await s3.zSetClear(setName);



    }, 100);
   // Logger.debug(EpochUtils.toDayEpoch(new Date('2018-10-19 23:58:24.175+00')))
}
else {
    module.exports = ClientEngine;
}