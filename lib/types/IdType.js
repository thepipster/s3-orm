import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "Chance";
const chance = new Chance();

class IdType extends BaseType {
    constructor(){
        super('id', true);
    }    
    mock(){ 
        return chance.integer({ min: 1, max: 20000 })
    }
    encodeExtended(val){
        return val+'';
    }
    parseExtended(val){ 
        let no = parseInt(val);
        if (_.isFinite(no)){
            return no
        }
        return null;
    }
}

export default  new IdType();