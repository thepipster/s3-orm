const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const chance = new Chance();

class FloatType extends BaseType {
    constructor(){
        super('float', true);
    }    
    mock(){ 
        return chance.floating({ min: 0, max: 1000000});
    }
    encodeExtended(val){
        return val+'';
    }
    parseExtended(val){ 
        let flno = parseFloat(val);
        if (_.isFinite(flno)){
            return flno;
        }
        return null;
    }
}

module.exports = new FloatType();