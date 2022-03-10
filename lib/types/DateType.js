const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const Logger = require('../utils/Logger');
const chance = new Chance();

class DateType extends BaseType {
    constructor(){
        super('date', true);
    }    
    mock(){ 
        return chance.date();
    }
    parseExtended(val){ 
        let epoch = parseInt(val)
        if (_.isFinite(epoch)){
            return new Date(epoch)
        }
        return null;
    }
    encodeExtended(val){         
        if (!val){
            return '0'
        }            
        return new Date(val).getTime()+'';     
    }   
}

module.exports = new DateType();