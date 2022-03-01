const BaseModel = require('./BaseModel')

class FormstackMeta extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'FormstackMeta'
    }

    static _model(){
        return {
            uid: {type:'string', index:true},
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            formId: {type:'string', index:true},
            uniqueId: {type:'string'},
            formType: {type:'string',},
            date: {type:'date', defaultValue: ()=>{return new Date()}},
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

FormstackMeta.register()

if(require.main === module) {

    const Logger = require('../../utils/logger')
    const Settings = require('../../Settings')
    Logger.setLevel('debug')
    
    async function doTest(){

        let doc = new FormstackMeta()
        await doc.save()
        Logger.debug('doc = ', doc)


        let doc2 = await FormstackMeta.findOne({})

        Logger.debug('doc2 = ', doc2)


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
    module.exports = FormstackMeta
}


