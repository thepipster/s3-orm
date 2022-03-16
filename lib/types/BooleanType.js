import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "chance";
import Logger from "../utils/Logger.js";
const chance = new Chance();

class BooleanType extends BaseType {
    constructor(){
        super('boolean', false);
    }    
    mock(){ 
        return chance.bool();
    }
    encodeExtended(val){
        if (val == 'true'){
            return '1';
        }
        else if (val == 'false'){
            return '0';
        }
        else if (val == ''){
            return '0';
        }
        return (val) ? '1' : '0';
    }
    parseExtended(val){ 
        if (val == 1 || val == '1'){
            return true;
        }
        return false;
    }
}

export default  new BooleanType();