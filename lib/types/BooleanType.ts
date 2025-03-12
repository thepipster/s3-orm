import _ from "lodash";
import {BaseType} from "./BaseType";
import Chance from "chance";
import Logger from "../utils/Logger.js";
const chance = new Chance();

class BooleanType {
    
    mock(){ 
        return chance.bool();
    }

    toString(val: boolean | string | number){        
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
    
    fromString(val: string | number): boolean {        
        if (val == 1 || val == '1'){
            return true;
        }
        return false;
    }
}

export default new BooleanType();