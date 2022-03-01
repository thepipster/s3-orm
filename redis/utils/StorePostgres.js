/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../../utils/logger')
const _ = require('lodash')
const Promise = require('bluebird')
const UniqueKeyViolationError = require('../../../lib/UniqueKeyViolationError.js')
const ImageUtils = require('../../../utils/ImageUtils.js')
const Profiler = require('../../../utils/Profiler.js')
const ProgressBar = require('progress')

/**
 * Persistent storage for redis
 */
class StorePostgres {
    
    /**
     * 
     * @param {*} PostgresModel 
     * @param {*} RedisModel 
     * @param {object} opts Options; 
     * - mode: 'sync' this is a full sync, firsy copying from redis to postgres and then postgres back to redis
     *         'postgres-to-redis' copy data from postgres to redis
     *         'redis-to-postgres' copy data from redis to postgres), 
     * - indexField: The index field, i.e. a field that is the same in both db's and unique (e.g. 'uuid')
     */
    constructor(PostgresModel, RedisModel, opts) {    

        this.PostgresModel = PostgresModel
        this.RedisModel = RedisModel
     
        let defaults = {
            mode: 'sync',
            indexField: 'uuid',
            baseRedisQuery: {},
            basePostgresQuery: {},
        }

        this.options = _.merge({}, defaults, opts);
        this.model = RedisModel._modelExtended()

        //Logger.debug('Syncing with options = ', this.options)

        let rKeys = Object.keys(this.model)
        //let mKeys = Object.keys(PostgresModel.attributes)
        let keys = _.uniq(_.concat(rKeys, ['created','modified']))   
        this.keys = _.without(keys, '_id', '__v', 'id')      

        //Logger.debug('options = ', this.keys)

    }

    /**
     * Store the `postgresItem` into redis. If the item already exists in Redis, it will be over-written
     * @param {object} postgresItem An instance of the postgres model
     */
    async toRedis(postgresItem){

        try {

            // Load from redis, everything should have either a uuid or *only* a uid (for users)
            //var qry = (postgresItem.uuid) ? {uuid:postgresItem.uuid} : {uid:postgresItem.uid}
            var qry = {}
            qry[this.options.indexField] = postgresItem[this.options.indexField].trim()

            var redisItem = await this.RedisModel.findOne(qry)

            //Logger.warn('postgresItem = ', postgresItem.dataValues)
            //Logger.warn('redisItem = ', redisItem, qry)

            if (!redisItem){
                //Logger.info(`${this.RedisModel._name()} ${JSON.stringify(qry)} does not exist in redis, so creating`)                
                redisItem = new this.RedisModel(qry)                        
            }

            for (let i=0; i<this.keys.length; i+=1){                    
                
                let def = this.model[this.keys[i]]                            
                var rKey = this.keys[i]
                var pKey = (def && def.mappedKey) ? def.mappedKey : rKey

                redisItem[rKey] = postgresItem[pKey]

                //Logger.debug(`[${rKey}] ${redisItem[rKey]} = ${postgresItem[pKey]}`)
            }

            try {
                //redisItem.id = postgresItem._id.toString()
                //Logger.error(`${this.RedisModel._name()} created = ${redisItem.created}`)
                await redisItem.save()
            }
            catch(err){   

                if (err instanceof UniqueKeyViolationError && err.toString().search('displayName') !== -1){
                    redisItem.displayName = redisItem.uid
                    await redisItem.save()
                }
                else {
                    Logger.error(err)
                    Logger.error('qry = ', qry)
                    Logger.error('redisItem = ', redisItem)
                    Logger.error('postgresItem = ', postgresItem.dataValues)
                }

            }            

            return
        }
        catch(err){
            Logger.error(err)
            Logger.error(`rKey = ${rKey}, pKey = ${pKey}`)
            Logger.error('qry = ', qry)
            Logger.error('redisItem = ', redisItem)
            Logger.error('postgresItem = ', postgresItem.dataValues)
            process.exit(1)
        }
    }

    /**
     * Store the `redisItem` into postgres. If the item already exists in Redis, it will be over-written
     * @param {object} postgresItem An instance of the postgres model
     */
    async toPostgres(redisItem){

        try {

            //Logger.info('RedisItem = ', redisItem)
            
            var qry = {}
            qry[this.options.indexField] = redisItem[this.options.indexField].trim()

            /*
            if (redisItem.uuid){
                redisItem.uuid = redisItem.uuid.trim()
                qry = {uuid:redisItem.uuid}
            }
            else {
                redisItem.uid = redisItem.uid.trim()
                qry = {uid:redisItem.uid}
            }
            */

            var postgresItem = await this.PostgresModel.findOne({where:qry})

            if (!postgresItem){
                //Logger.info(`${this.RedisModel._name()} ${JSON.stringify(qry)} does not exist in postgres, so creating`)
                postgresItem = new this.PostgresModel(qry)
            }

            // Update

            for (let i=0; i<this.keys.length; i+=1){
                
                let def = this.model[this.keys[i]]
                var rKey = this.keys[i]
                var pKey = (def && def.mappedKey) ? def.mappedKey : rKey

                // Make sure avatars images are not base64
                if (rKey == 'avatar' && postgresItem.uid){

                    let opts = {
                        path: 'player',
                        entityId: postgresItem.uid,
                        extension: 'png'
                    }

                    postgresItem.avatar = await ImageUtils.processBase64Image(postgresItem.avatar, opts)

                }
                else {

                    // If this is a uuid, then we need to make sure a blank string is changed to
                    // null otherwise Postgres will complain
                    if (def.type == 'string' && redisItem[rKey] === ''){
                        //Logger.error(`${redisItem.uuid} - [${pKey}] ${postgresItem[pKey]} = ${redisItem[rKey]}`)
                        postgresItem[pKey] = null           
                    }
                    else {
                        //Logger.warn(`${redisItem.uuid} - [${pKey}] ${postgresItem[pKey]} = ${redisItem[rKey]}`)
                        postgresItem[pKey] = redisItem[rKey]              
                    }
                }

            }

            await postgresItem.save()

            return 

        }
        catch(err){
            Logger.error(err)
            Logger.error('qry = ', qry)
            Logger.error('redisItem = ', redisItem)
            if (postgresItem){
                Logger.error('postgresItem = ', postgresItem.dataValues)
            }
            process.exit(1)
        }
                
    }

    /**
     * Sync between a Postgres and this Redis Model
     * @param {*} PostgresModel 
     * @param {boolean} isOneWay If true, only copy data from redis to postgres
     */
    async sync(){

        Logger.info(`Syncing ${this.RedisModel._name()}.....`)


        //let prof = new Profiler()
        //prof.start(`${this.RedisModel._name()}`)

        //
        // Look at all the items in redis, and compare to postgres
        //

        if (this.options.mode == 'sync' || this.options.mode == 'redis-to-postgres'){

            // Get the items, but just the id's so it scales
            
            var redisIds = await this.RedisModel.getIds(this.options.baseRedisQuery)

            Logger.info(`Found ${redisIds.length} ${this.RedisModel._name()}'s in Redis`)

            var bar1 = new ProgressBar(`  ${this.RedisModel._name()} Redis --> Postgres [:bar] :rate/ps :percent :etas`, {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: redisIds.length
            });

            await Promise.map(redisIds, async (redisId)=>{        
                //prof.start(`${this.RedisModel._name()}-ToPostgres-loop`)
                // Load from redis, everything should have either a uuid or uid (for users)
                var redisItem = await this.RedisModel.loadFromId(redisId)
                
                if (redisItem){
                    await this.toPostgres(redisItem)
                }
                else {
                    Logger.warn(`Could not find redis item with index ${redisId}`)
                }

                bar1.tick()
                //prof.stop(`${this.RedisModel._name()}-ToPostgres-loop`)
                return
            }, {concurrency: 1})      

        }

        //
        // Look at all the items in postgres, and copy to redis
        //

        if (this.options.mode == 'sync' || this.options.mode == 'postgres-to-redis'){

            // Get the items, but just the id's so it scales
            let postgresItems = await this.PostgresModel.findAll({where:this.options.basePostgresQuery, attributes: [this.options.indexField]})

            if (!postgresItems){
                postgresItems = []
            }

            Logger.info(`Found ${postgresItems.length} ${this.RedisModel._name()}'s in Postgres`)

            var bar2 = new ProgressBar(`  ${this.RedisModel._name()} Postgres --> Redis [:bar] :rate/ps :percent :etas`, {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: postgresItems.length
            });

            await Promise.map(postgresItems, async (info)=>{
                //prof.start(`${this.RedisModel._name()}-ToRedis-loop`)
                let qry = {}
                qry[this.options.indexField] = info[this.options.indexField]
                let postgresItem = await this.PostgresModel.findOne({where:qry})
                await this.toRedis(postgresItem)
                bar2.tick()
                //prof.stop(`${this.RedisModel._name()}-ToRedis-loop`)
                return
            }, {concurrency: 1})

        }

        //prof.stop(`${this.RedisModel._name()}`)        
        //prof.showResults()

        return 
    }

}

if(require.main === module) {

    const Settings = require('../../../Settings.js')
    const UserGame = require('../../sql/UserGame')(Settings.sequelize)
    const rUserGame = require('../UserGame.js')

    async function doTest(){

        var opts = {
            mode: 'redis-to-postgres',
            indexField: 'uuid',
            baseRedisQuery: {uid: 'KIWglD3T1tXHMGW2qmvmDy8RXmF3'},
            basePostgresQuery: {userUid: 'KIWglD3T1tXHMGW2qmvmDy8RXmF3'},    
        }

        let storage = new StorePostgres(UserGame, rUserGame, opts)
        await storage.sync()

    }

    doTest().then().catch(err=>{Logger.error(err)})



}
else {
    module.exports = StorePostgres;
}
