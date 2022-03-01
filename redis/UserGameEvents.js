const Logger = require('../../utils/logger')
const BaseModel = require('./BaseModel')
const _ = require('lodash')

class UserGameEvents extends BaseModel {
        
    constructor(data){
        super(data)        
    }

    static _name(){
        return 'UserGameEvents'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            type: {type:'string', index:true},
            uid: {type:'string', index:true},
            displayName: {type:'string', index:true},
            message: {type:'string'},
            gameId: {type:'string', index:true, mappedKey: 'gameUuid'},
            showId: {type:'string', index:true, mappedKey: 'showUuid'},
            result: {type:'boolean', index:true},
            item: {type:'json'},
            state: {type:'json'},
            userGame: {type:'json'},
            sesh: {type:'json'},
            date: {type:'date'}
        }
    }  

}

UserGameEvents.register()

if(require.main === module) {


}
else {
    module.exports = UserGameEvents
}
