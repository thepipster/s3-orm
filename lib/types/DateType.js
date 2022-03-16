import {isFinite} from "lodash";
import BaseType from "./BaseType";
import Chance from "chance";
import Logger from "../utils/Logger.js";
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
        if (isFinite(epoch)){
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

export default  new DateType();