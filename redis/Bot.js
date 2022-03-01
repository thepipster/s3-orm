const BaseModel = require('./BaseModel')

class Bot extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'Bot'
    }

    static _model(){
        return {
            uid: { type: 'string', index:true},
            username: { type: 'string' },
            password: { type: 'string' },
            gameUuid: { type: 'string' },
            showId: { type: 'string', index:true},
            isPlaying: { type: 'boolean', defaultValue: false, index:true }
        }
    }     
}

Bot.register()

module.exports = Bot