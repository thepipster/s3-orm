const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const chance = new Chance();
const Logger = require('../utils/Logger.js');

class ArrayType extends BaseType {
    constructor(){
        super('array', false);
    }    
    mock(){ 
        return chance.n(chance.word, 5);
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

export default  new ArrayType();