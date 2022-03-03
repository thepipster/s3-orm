
const Logger = require("./utils/Logger");
const _ = require("lodash");
const AmazonHelper = require('./utils/AmazonHelper');
const Promise = require('bluebird');
const uuidv4 = require('uuid/v4');
const slugify = require('slugify');
const base64url = require('base64url');

class Engine {
    
    constructor(opts){
        if (!opts){
            opts = {acl:'private'}
        }        
        this.indexPath = process.env.AWS_INDEX_FOLDER;
        this.aws = new AmazonHelper(opts);
    }

    _encode(str){
        return base64url(str);
    }

    _decode(hash){
        return base64url.decode(hash);
    }
       
    // ///////////////////////////////////////////////////////////////////////////////////////

    async get(key){
        return await this.aws.get(`${this.indexPath}/${key}`);
    }

    async set(key, val){
        await this.aws.uploadString(val, `${this.indexPath}/${key}`);
    }

    async del(key){
        await this.aws.delete(`${this.indexPath}/${key}`);
    }
    
	// ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * If your bucket is not set for public read access, you can call this to set ready 
     * just on the folders used by this 
     */
    async setupReadPermissions(){
        await this.aws.setFolderPublicRead('s3orm');
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async writeItem(keyMeta, val){

    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    __getPath(prefix, setName, val){        
        if (!val){
            return `${this.indexPath}/${prefix}/${setName}/`
        }
        return `${this.indexPath}/${prefix}/${setName}/${this._encode(val)}`
    }

    /**
     * Add a value into a unordered set
     * @param {*} setName 
     * @param {*} val 
     */
    async setAdd(setName, val){   
        //let res = await this.aws.getObjectACL(`${this.indexPath}/sets/${setName}`);
        //Logger.warn(res);
        //await this.aws.setObjectACL(`${this.indexPath}/sets/${setName}`, 'public-read');    
        await this.aws.uploadString('true', this.__getPath('sets', setName, val));
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async setRemove(setName, val){
        await this.aws.delete(this.__getPath('sets', setName, val));
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

    async setObject(obj){
        if (!obj.id){
            obj.id = uuidv4();
        }
        let txt = JSON.stringify(obj);
        //let key = this.__getPath('sets', setName, val);
        await this.aws.uploadString(txt, `${this.indexPath}/hash/${obj.id}`);
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getObject(id){
        let res = await this.aws.get(`${this.indexPath}/hash/${id}`);
        return JSON.parse(res);
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
    async zSetAdd(setName, score, val){

        const pad = "0000000";
        const scoreStr = (pad+score).slice(-pad.length);

        let key = `${this.indexPath}/zsets/${setName}/${scoreStr}###${this._encode(val)}`
        await this.aws.uploadString('', key);

        // Also stash a index so we can find by val if we don't know the score
        let key2 = `${this.indexPath}/zsetsind/${setName}/${this._encode(val)}`
        await this.aws.uploadString(scoreStr, key2);

    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////

    async zSetRemove(setName, val){

        // Look up key by val using the index
        let keyIndex = `${this.indexPath}/zsetsind/${setName}/${this._encode(val)}`;
        let scoreStr = await this.aws.get(keyIndex);

        // Now we can delete both the val and the key as we know the score now
        await this.aws.delete(keyIndex);
        await this.aws.delete(`${this.indexPath}/zsets/${setName}/${scoreStr}###${this._encode(val)}`);
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

    async zSetClear(setName){
        let items = await this.aws.list(this.__getPath('zsets', setName));
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }
        // Clear the index too
        items = await this.aws.list(this.__getPath('zsetsind', setName));
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


/*
    async __deleteIndices(uuid){
        let keys = [
            `${process.env.AWS_INDEX_FOLDER}/uuid-to-slug/${uuid}`
            `${process.env.AWS_INDEX_FOLDER}/uuid-to-slug/*-${uuid}`
        ];
        await Promise.map(keys, async (key) => {
            await aws.delete(key);
        });
    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    async __createIndices(item){
        await aws.uploadString(item.slug, `${process.env.AWS_INDEX_FOLDER}/uuid-to-slug/${item.uuid}`);
        await aws.uploadString(item.uuid, `${process.env.AWS_INDEX_FOLDER}/schema-to-content/${item.type}###${item.uuid}`);
    },
    */

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