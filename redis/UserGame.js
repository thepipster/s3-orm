const Logger = require('../../utils/logger')
const BaseModel = require('./BaseModel.js')
const _ = require('lodash')

class UserGame extends BaseModel {
        
    constructor(data){
        super(data)        
    }

    static _name(){
        return 'UserGame'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            uid: {type:'string', index:true, mappedKey: 'userUid'},
            //userUid: {type:'string', index:true},
            ip: {type:'string'},
            dayEpoch:  {type:'integer', defaultValue:0}, 
            gameId: {type:'string', index:true, mappedKey: 'gameUuid'},
            showId: {type:'string', index:true, mappedKey: 'showUuid'},
            username: {type:'string', defaultValue:''},
            displayName: {type:'string', defaultValue:'', index:true},
            // flag to see if a user is still watching the game
            isWatching: {type:'boolean', defaultValue:false, index:true}, 
            isWatchingLastDate: {type:'date'}, 
            // flag to see if a user has already used an extra life   
            isExtraLife: {type:'boolean', defaultValue:false, mappedKey: 'usedExtraLife'}, 
            // The index of the last question this user voted on  
            lastVoteQuestionIndex: {type:'integer', defaultValue:-1, index:true}, 
            // The uid of the last question this user voted on  
            lastVoteQuestionId: {type:'string', defaultValue:''}, 
            // Array of boolean to indicae voting history
            validVoteHistory: {type:'json', defaultValue:[]}, 
            // flag to see if a user has joined a game       
            isJoinedGame: {type:'boolean', defaultValue:false, index:true}, 
            noQuestionsAnswered: {type:'integer', defaultValue:0, mappedKey: 'numberAnswered'}, 
            noQuestionsCorrect: {type:'integer', defaultValue:0, mappedKey: 'numberCorrect'}, 
            // gems earned this game
            gemsEarned: {type:'integer', defaultValue:0}, 
            // cash earned this game
            cashEarned: {type:'integer', defaultValue:0}, 
            // Flags a user is a special contestant
            isContestant: { type: 'boolean', defaultValue: false, index:true },         
            // Store the prev isActive state to return when a question is still open
            isActivePrev: {type:'boolean', defaultValue:false, index:true},
            // flag to see if a user is still in a game (i.e. this is set to zero if they get a question wrong)
            isActive: {type:'boolean', defaultValue:false, index:true},
            isVoting: {type:'boolean', defaultValue:false, index:true},
            // Flag to determin if cash that was earned in this game has been add to the user yet
            isPaidout: {type:'boolean', defaultValue:false},
            isWinner: {type:'boolean', defaultValue:false, index:true}
        }
    }  

    /**
     * Get a list of user id's of users in this game
     * TODO: make this faster, using keys is potentially slow!!!!
     * @param {*} showId 
     * @param {*} callback 
     */
    static async getUserIds(showId){
        let ugames = await this.find({showId:showId})
        return _.map(ugames, 'uid')
    }


    /**
     * Get a list of user id's of users in this game that are still actively in the game (can still win)
     * TODO: make this faster, using keys is potentially slow!!!!
     * @param {*} showId 
     */
    static async getActiveUserIds(showId){
        let ugames = await this.find({showId:showId, isActive:true})
        return _.map(ugames, 'uid')
    }

    /**
     * Load a UserGame from the uid given by firebase and showId
     * @param {string} showId The show iud
     * @param {string} uid The firebase uid
     */
    static async load(showId, uid){
        return await this.findOne({showId:showId, uid:uid})
    }

    /**
     * Generate random sample data for this class
     */
    /*
    static generateMock(){
        
        let chance = new Chance()

        return {
            uid: chance.hash({length: 25}),
            ip: chance.ip(),
            gameId: chance.guid(),
            showId: chance.guid(),
            username: chance.name(),
            displayName: chance.name(),
            isWatching: chance.bool(), 
            isWatchingLastDate: chance.date(), 
            isExtraLife: chance.bool(), 
            lastVoteQuestionId: chance.guid(), 
            validVoteHistory: [], //chance.n(chance.bool(), 5), 
            isJoinedGame: chance.bool(), 
            noQuestionsCorrect: chance.d12(), 
            gemsEarned: chance.d100(), 
            cashEarned: chance.d100(), 
            isTransferred: chance.bool(),
            isActive: chance.bool(),
            isWinner: chance.bool()
        }
    }

    */
}

if(require.main === module) {

    const BaseModel = require('./BaseModel.js')
    const BaseModelHelper = require('./BaseModelHelper.js')
    const Settings = require('../../Settings')
    Logger.setLevel('debug')

    async function doTest(){

        let testInfo = UserGame.generateMock()   
        testInfo.id = '7ff141902b8948ecab1ce17c'
       
        let user = new UserGame(testInfo)
        await user.save()
        Logger.debug('user1 = ', user.isActive)

        let key1 = `${BaseModelHelper.getKey(UserGame._name(), 'index')}:isActive:true`
        let key2 = `${BaseModelHelper.getKey(UserGame._name(), 'index')}:isActive:false`

        let testIdSet1 = await BaseModel._redisCommand('sismember', key1, testInfo.id)
        let testIdSet2 = await BaseModel._redisCommand('sismember', key2, testInfo.id)

        Logger.debug(`[BEFORE] ${testIdSet1} | ${testIdSet2}`)
        
        await UserGame.setFieldById(testInfo.id, 'isActive', !user.isActive)

        let loadedUser = await UserGame.findOne({uid:testInfo.uid})
        Logger.debug('loadedUser = ', loadedUser.isActive)

        testIdSet1 = await BaseModel._redisCommand('sismember', key1, testInfo.id)
        testIdSet2 = await BaseModel._redisCommand('sismember', key2, testInfo.id)

        Logger.debug(`[AFTER] ${testIdSet1} | ${testIdSet2}`)


        
/*
        let vals = await UserGame.getField({uid:testInfo.uid}, 'username')
        Logger.debug('vals = ', vals)

        let res = await UserGame.setField({uid:testInfo.uid}, 'username', 'mikeyp-tester')
        Logger.debug('res = ', res)


        loadedUser.username = "BLARG"
        let updatedUser = await loadedUser.save()
        Logger.debug('updatedUser = ', updatedUser)
        
        let ids = await UserGame.getIds({isActive:true})
        Logger.debug('ids = ', ids)
        
        let ct = await UserGame.count({isActive:true})
        Logger.debug('count = ', ct)

        let test2 = await UserGame.distinct('isActive')
        Logger.debug('distinct = ', test2)

        //let test3 = await UserGame.find()
        //Logger.debug('distinct = ', test3)        

        let test4 = await UserGame.load(testInfo.showId, testInfo.uid)
        Logger.debug('load = ', test4)

        let test5 = await UserGame.getUserIds(testInfo.showId)
        Logger.debug('getUserIds = ', test5)    
        */
        
    }

    Settings.redisClient.once("connect", async (err) => {

        doTest()
            .then()
            .catch(err=>{
                Logger.error(err)
            })

    })


}
else {
    module.exports = UserGame
}
