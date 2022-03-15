const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const chance = new Chance();

class IntegerType extends BaseType {
    constructor(){
        super('integer', true);
    }    
    mock(){ 
        return chance.integer({ min: -20000, max: 20000 });
    }
    encodeExtended(val){
        return val+'';
    }
    parseExtended(val){ 
        let flno = parseInt(val);
        if (_.isFinite(flno)){
            return flno;
        }
        return null;
    }
}

export default  new IntegerType();