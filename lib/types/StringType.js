import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "Chance";
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