const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const chance = new Chance();
const Logger = require('../utils/Logger.js');

class JsonType extends BaseType {
    constructor(){
        super('json', false);
    }    
    mock(){ 
        return {
            a: chance.integer({ min: -200, max: 200 }),
            b: chance.name(),
            c: chance.d100(),
            d: chance.floating({ min: 0, max: 1000})    
        }
    }
    parseExtended(val){ 
        try {
            return JSON.parse(val);
        }
        catch(err){
            Logger.error(`Error decoding json string ${val}`);
        }
        return null
    }
    encodeExtended(val){         
        return JSON.stringify(val);
    }        
}

export default  new JsonType();