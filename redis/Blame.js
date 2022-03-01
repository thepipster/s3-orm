/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../utils/logger')
const BaseModel = require('./BaseModel')
const requestIp = require('request-ip')

class Blame extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'Blame'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            action: {type: 'string'},            
            ip: {type: 'string'},            
            userId: {type: 'string', index:true, mappedKey: 'userUid'},            
            username: {type: 'string'},            
            refItem: {type: 'json'},            
            created: {type: 'date'}
        }
    }    

    static async addEvent(req, description, refItem) {

        if (!req.sesh){
            Logger.error("No session in Blame.addEvent!")
            return
        }

        // Create an event in the activity tracker
        let act = new Blame({
            action: description,
            userId: req.sesh.uid,
            username: req.sesh.username,
            //type: 'admin',
            ip: requestIp.getClientIp(req),
            refItem: refItem,
            created: Date.now()
        })

        return await act.save()

    }

    static async load(id){
        return await this.findOne({id:id})
    }
 
}

Blame.register()

module.exports = Blame