import {random} from "lodash";
import BaseType from "./BaseType";
import Chance from "chance";
const chance = new Chance();

class StringType extends BaseType {
    constructor(){
        super('string', false);
    }    
    mock(){ 
        return chance.sentence({words: random(1,20)});
    }
}

export default  new StringType();