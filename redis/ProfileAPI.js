const BaseModel = require('./BaseModel')

class ProfileAPI extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'ProfApi'
    }

    static _model(){
        return {
            url: {type:'string', index:true},
            ct: {type:'integer', defaultValue: 0},
            total: {type:'integer', defaultValue: 0},
            average: {type:'integer', defaultValue: 0},
            times: {type:'json', defaultValue: []}        
        }
    }    

    static async load(url){
        return await this.findOne({url:url})
    }
 
}

ProfileAPI.register()

module.exports = ProfileAPI

/*
const BaseModel = require('./OldBaseModel')

class ProfileAPI extends BaseModel {
    
    constructor(data) {
        super() 
        this._init(data) 
    }

    static _prefix(){
        return 'pcl:profiling:'
    }

    static _model(){
        return {
            id: {type:'string'},
            url: {type:'string'},
            ct: {type:'number', default: 0},
            total: {type:'number', default: 0},
            average: {type:'number', default: 0},
            times: {type:'array', default: []}        
        }
    }    

    static remove(id, token, callback){
        return super._remove(ProfileAPI._prefix()+ id, callback)
    }

    static setByKey(id, key, val, callback){
        return super._setByKey(ProfileAPI._prefix()+ id + ':' + key, val, callback);
    }

    static getByKey(id, key, callback){
        return super._getByKey(ProfileAPI._prefix() + id + ':' + key, callback);
    }

    save(callback){
        let baseKey = ProfileAPI._prefix()+this.id
        return this._save(baseKey, callback)
    }

    static load(id, callback){
        let doc = new ProfileAPI({})
        let baseKey = ProfileAPI._prefix()+id+':'
        return doc.load(baseKey, callback)
    }
 
}

module.exports = ProfileAPI
*/