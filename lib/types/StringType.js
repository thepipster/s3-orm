const _ = require('lodash')
const BaseType = require('./BaseType');
const Chance = require('chance');
const chance = new Chance();

class StringType extends BaseType {
    constructor(){
        super('string', false);
    }    
    mock(){ 
        return chance.sentence({words: _.random(1,20)});
    }
}

export default  new StringType();