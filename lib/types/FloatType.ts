import {isFinite} from "lodash";
import BaseType from "./BaseType";
import Chance from "chance";
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
        if (isFinite(flno)){
            return flno;
        }
        return null;
    }
}

export default  new FloatType();