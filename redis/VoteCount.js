/**
 * @author: mike@arsenicsoup.com
 */
const BaseModel = require('./BaseModel')

class VoteCount extends BaseModel{
        
    constructor(data) {    
        super(data) 
    }

    static _name(){
        return 'VoteCounts'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            gameId: {type:'string', index:true, mappedKey: 'gameUuid'},
            showId: {type:'string', index:true, mappedKey: 'showUuid'},
            questionId: {type:'string', index:true, mappedKey: 'questionUuid'},
            answerId: {type:'string', index:true, mappedKey: 'answerUuid'},
            validCount: {type:'integer', defaultValue:0},
            invalidCount: {type:'integer', defaultValue:0}
        }
    }

    static async load(showId, questionId, answerId){        
        return await this.findOne({showId:showId, questionId:questionId, answerId:answerId})
    }    

}

VoteCount.register()

module.exports = VoteCount
