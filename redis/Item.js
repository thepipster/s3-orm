/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../utils/logger')
const BaseModel = require('./BaseModel')

class Item extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'Item'
    }

    static _model(){
        return {
            // The item name
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            // The item name
            name: {type: 'string'},
            // The item type, taken from the catalog 
            type:  {type: 'string', index: true},  
            // The catalog uuid  
            catalogUuid: {type: 'string', index: true},
            // The user uid
            userUid: {type: 'string', index:true}, // to be deprecated
            // The user uid
            uid: {type: 'string', index:true},
            // The IP address logged when purchased
            ip:  {type: 'string'},
            // A token used for verification
            token:  {type: 'string', index:true},
            // The show id the item was consumed in    
            showId: {type: 'string', index:true, mappedKey: 'showUuid'},
            // The game uuid the item was consumed in    
            gameUid: {type: 'string', index:true, mappedKey: 'gameUuid'},
            // The question uid the item was consumed in    
            questionUid: {type: 'string', index:true, mappedKey: 'questionUuid'},
            // The price paid
            price: {type: 'integer'},
            // The date the item was consumed
            timeConsumed: {type: 'timestamp', index:true},
            // The date the item was created
            timeMinted: {type: 'timestamp', index:true},
            status: { type: 'string', enum: ['unused', 'used', 'deleted'], defaultValue: 'unused', index: true }
        }
    }    
    
    static async load(itemId){
        return await this.findOne({itemId:itemId})
    }
 
}

Item.register()

if(require.main === module) {

    const Settings = require('../../Settings')

    async function doTest(){
        let qry = {
            //userUid:'EGogvMeMS6eq29opbte9FiDCko32', 
            //gameUid: 'b63726bd0c35482e837d22dd', 
            type: 'remove-1'
        }
        let items = await Item.find(qry)
        Logger.debug('items = ', items)
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
    module.exports = Item
}

