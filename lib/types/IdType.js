const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const chance = new Chance();

class IdType extends BaseType {
    constructor(){
        super('id', true);
    }    
    mock(){ 
        return chance.integer({ min: 1, max: 20000 })
    }
    encodeExtended(val){
        return val+'';
    }
    parseExtended(val){ 
        let no = parseInt(val);
        if (_.isFinite(no)){
            return no
        }
        return null;
    }
}

export default  new IdType();