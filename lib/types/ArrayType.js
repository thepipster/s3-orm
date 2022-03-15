import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "Chance";
import Logger from "../utils/Logger.js";

class ArrayType extends BaseType {
    constructor(){
        super('array', false);
    }    
    mock(){ 
        return chance.n(chance.word, 5);
    }
    parseExtended(val){ 
        try {
            return JSON.parse(val);
        }
        catch(err){
            Logger.error(`Error decoding json string ${val}`);
        }
        return null
    }
    encodeExtended(val){         
        return JSON.stringify(val);
    }   
}

export default  new ArrayType();