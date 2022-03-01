/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../utils/logger')
const BaseModel = require('./BaseModel')

class Vote extends BaseModel{
        
    /**
     * Instantiate a Vote
     * @param {Object} data The vote data
     */
    constructor(data) {    
        super(data) 
    }

    static _name(){
        return 'Vote'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            ip: {type:'string'},
            userId: {type:'string', index:true, mappedKey: 'userUid'},
            gameId: {type:'string', index:true, mappedKey: 'gameUuid'},
            showId: {type:'string', index:true, mappedKey: 'showUuid'},            
            questionId: {type:'string', index:true, mappedKey: 'questionUuid'},       
            answer: {type:'string', index:true},
            answerTime: {type:'number'},
            message: {type:'string'},
            // Set to 1 if they user is in the game, 0 if not
            isValid: {type:'boolean', defaultValue:false, index:true},
            isCorrect: {type:'boolean', defaultValue:false, index:true},
            timestamp: {type:'integer', index:true},
        }
    }

    static async load(showId, userId, questionId){        
        return await this.findOne({showId:showId, userId:userId, questionId:questionId})
    }

}

Vote.register()

if(require.main === module) {

    let qry = { showId: '5bb3af175fb7a1635e8e6a83', questionId: '439017ee-7eeb-410f-b916-75305ce61d22' }

    Vote
        //.distinct(qry, 'userUid')
        .find(qry)
        .then(data=>{
            Logger.debug(data)
        })
        .catch(err=>{
            Logger.error(err)
        })

}
else {
    module.exports = Vote
}
