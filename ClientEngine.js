
const Logger = require("./utils/Logger");
const _ = require("lodash");
const Promise = require('bluebird');
const Engine = require("./Engine");
const base64url = require('base64url');
const ClientAWS = require('./ClientAWS');

class ClientEngine {
    
    constructor(rootUrl){
        if (!rootUrl){
            rootUrl = process.env.AWS_CLOUDFRONT_URL;
        }
        this.url = rootUrl;
        this.indexPath = process.env.AWS_INDEX_FOLDER;
        this.aws = new ClientAWS(rootUrl);
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    _encode(str){
        return base64url(str);
    }

    _decode(hash){
        return base64url.decode(hash);
    }
           
	// ///////////////////////////////////////////////////////////////////////////////////////

    __getPath(prefix, setName, val){        
        if (!val){
            return `${this.indexPath}/${prefix}/${setName}`
        }
        return `${this.indexPath}/${prefix}/${setName}/${this._encode(val)}`
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setIsMember(setName, val){
        return await this.aws.exists(this.__getPath('sets', setName, val));
    }
    
	// ///////////////////////////////////////////////////////////////////////////////////////

    async setMembers(setName){
        let res = await this.aws.list(`${this.indexPath}/sets/${setName}`);
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
        return await this.aws.get(this.__getPath('sets', setName, key));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObject(id){
        let res = await this.aws.get(`${this.indexPath}/hash/${id}`);
        return JSON.parse(res);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetMembers(setName, scores){
        
        let key = `${this.indexPath}/zsets/${setName}/`;
        let res = await this.aws.list(key);

        let list = _.map(res, (item)=>{

            let key = item.Key.split('/').pop();
            let parts = key.split('###');
            parts[1] = this._decode(parts[1]);

            if (scores){
                return {
                    score: parseInt(parts[0]),
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

        let res = await this.zSetMembers(setName, true);
        
        let items = [];
        for (let i=0; i<res.length; i+=1){
            let item = res[i];
            let lowerFlag = false;
            let upperFlag = false;

            if (opts.gt && item.score > opts.gt){
                upperFlag = true;
            }
            else if (opts.gte && item.score >= opts.gte){
                upperFlag = true;
            }

            if (opts.lt && item.score < opts.lt){
                lowerFlag = true;
            }
            else if (opts.lte && item.score <= opts.lte){
                lowerFlag = true;
            }

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
        return await this.aws.get(`${this.indexPath}/${key}`);
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