import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "Chance";
const chance = new Chance();
import Logger from "../utils/Logger.js";

class JsonType extends BaseType {
    constructor(){
        super('json', false);
    }    
    mock(){ 
        return {
            a: chance.integer({ min: -200, max: 200 }),
            b: chance.name(),
            c: chance.d100(),
            d: chance.floating({ min: 0, max: 1000})    
        }
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

export default  new JsonType();