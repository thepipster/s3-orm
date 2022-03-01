"use strict";

const BaseModel = require('./BaseModel')

class CatalogItem extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'CatItem'
    }

    static _model(){
        return {
            // The cat item id, created automatically
            uuid: {type: 'string', index: true},            
            // The cat item name
            name: {type: 'string', index: true},            
            // The cat item name
            description: {type: 'string'},
            // The price, in gems
            price: {type: 'integer'},
            // The cat item type ('extra-life','remove-1','undefined')
            type:  {type: 'string', enum: ['extra-life', 'remove-1', 'undefined'], defaultValue: 'undefined'},    
            status: { type: 'string', enum: ['active', 'deleted', 'pending'], defaultValue: 'active', index: true },
        }
    }    

    static async load(itemId){
        return await this.findOne({itemId:itemId})
    }
 
}

CatalogItem.register()

module.exports = CatalogItem