
const Logger = require("./utils/Logger");
const _ = require("lodash");
const AmazonHelper = require('./utils/AmazonHelper');
const Promise = require('bluebird');
const { legacy } = require("resolve.exports");

class Engine {
    
    constructor(opts){
        if (!opts){
            opts = {acl:'private'}
        }
        this.indexPath = process.env.AWS_INDEX_FOLDER;
        this.aws = new AmazonHelper(opts);
    }

    async writeItem(keyMeta, val){

    }

    /**
     * Add a value into a unordered set
     * @param {*} key 
     * @param {*} val 
     */
    async setAdd(key, val){
        //let setKey = `${this.indexPath}/${key}`;
        //const data = await aws.get(key);
        
        await this.aws.uploadString('1', `${this.indexPath}/sets/${key}/${val}`);
    }

    async setRemove(key, val){
        await this.aws.delete(`${this.indexPath}/sets/${key}/${val}`);
    }

    /**
     * Clear everything from a set
     * @param {string} key The set name
     */
    async setClear(key){
        let items = await this.aws.list(`${this.indexPath}/sets/${key}/`);
        if (items && items.length > 0){
            await this.aws.deleteAll(items);
        }
    }    

    async setIsMember(key, val){
        return await this.aws.exists(`${this.indexPath}/sets/${key}/${val}`);
    }

    // hgetall, smembers, get, zrevrangebyscore, zrangebyscore

    /**
     * Get the intersection of a number of sets
     * @param {array} keys An array of strings, with each string being the key of the set
     */
    async setIntersection(keys){
        let items = await Promise.map(keys, async (setKey) => {            
            let res = await this.aws.list(`${this.indexPath}/sets/${setKey}`);
            let list = _.map(res, (item)=>{
                return item.Key.split('/').pop();
            });
            return list;
        });        
        return _.intersection(...items);
    }

    async zadd(key, score, val){

    }
    
    async zrangebyscore(key, from, to){

    }

    async set(key, val){
        await this.aws.uploadString(item.slug, `${this.indexPath}/${key}`);

        //if (isInDb){
        //    await BaseModel._redisCommand('del', `${keyUnique}:${key}:${oldUniqueValue}`)
        //}        
        //await BaseModel._redisCommand('set', `${keyUnique}:${key}:${val}`, id)        

    }

    async del(key){
        await this.aws.delete(key);
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

        await s3.setClear('test-set-1');
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