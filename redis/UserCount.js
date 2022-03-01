/**
 * @author: mike@arsenicsoup.com
 */
const BaseModel = require('./BaseModel')

class UserCount extends BaseModel{
        
    constructor(data) {    
        super(data) 
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            gameId: {type:'string', index:true, mappedKey: 'gameUuid'},
            showId: {type:'string', index:true, mappedKey: 'showUuid'},
            activeUserCount: {type:'integer', defaultValue:0},
            totalUserCount: {type:'integer', defaultValue:0},
            timestamp: {type:'integer'}
        }
    }

    static _name(){
        return 'UserCounts'
    }

    static async addVotingCount(showId, questionId){
        let doc = await this.load(showId, questionId)
        doc.votingCount += 1
        return await doc.save()
    }

    static async addActiveCount(showId, questionId){
        let doc = await this.load(showId, questionId)
        doc.activeCount += 1
        return await doc.save()
    }

    static async load(showId, questionId, callback){        
        return await this.findOne({showId:showId, questionId:questionId})
    }

}

UserCount.register()

module.exports = UserCount
