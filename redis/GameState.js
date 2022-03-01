const BaseModel = require('./BaseModel')

class GameState extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'Game'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true},
            showId: {type:'string', index:true, mappedKey: 'showUuid'},
            potMain: {type:'integer', defaultValue: 0},
            potContender: {type:'integer', defaultValue: 0},
            potMainEach: {type:'integer', defaultValue: 0},
            title: {type:'string'},
            contestantUid: {type:'string', defaultValue: null},
            contestantAvatar: {type:'string', defaultValue: null},
            contestantStrikes: {type:'integer', defaultValue: 0},
            noUsersWatchingGame: {type:'integer', defaultValue:0},
            noUsersVoting: {type:'integer', defaultValue:0},
            noUsersInGame: {type:'integer', defaultValue:0},
            noUsers: {type:'integer', defaultValue:0},
            // Flag that is set once the game has started (i.e. you can join)
            isActive: {type:'boolean', defaultValue: false},
            // Flag that is set once the first question is asked (i.e. you can no longer join)
            isJoinable: {type:'boolean', defaultValue: false},
            // Flag that is set to 1 when a question is open
            isQuestionOpen: {type:'boolean', defaultValue: false},
            isStarted: {type:'boolean', defaultValue: false},
            preGameBanter: {type:'string', defaultValue: ''},
            postGameBanter: {type:'string', defaultValue: ''},
            dateScheduled: {type:'date', defaultValue: Date.now()},
            dateInitialized: {type:'date', defaultValue: Date.now()},
            dateStarted: {type:'date', defaultValue:null},
            dateEnded: {type:'date', defaultValue:null},
            prevQuestionIndex: {type:'integer', defaultValue: 0},
            currentQuestionIndex: {type:'integer', defaultValue: 0},
            prevQuestionId: {type:'string', defaultValue: 0},
            currentQuestionId: {type:'string', defaultValue: 0},
            currentQuestionStartEpoch: {type:'integer', defaultValue: 0},
            questionHistory: {type:'json', defaultValue: []},        
            questionIds: {type:'json', defaultValue: []}        
        }
    }    


    static async getActiveGameIds(callback){
        return await this.distinct('gameId', {isActive:true}) 
    }

    /**
     * Get a list of games id's in redis
     * TODO: make this faster, using keys is potentially slow!!!!
     * @param {*} gameId 
     */
    static async getGameIds(){
        return await this.distinct('gameId')
    }

    static async load(gameId){
        return await this.findOne({uuid:gameId})
    }

}

GameState.register()

module.exports = GameState