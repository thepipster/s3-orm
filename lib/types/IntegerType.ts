import {isFinite} from "lodash";
import BaseType from "./BaseType";
import Chance from "chance";
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
        if (isFinite(flno)){
            return flno;
        }
        return null;
    }
}

export default  new IntegerType();