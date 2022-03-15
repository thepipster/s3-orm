import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "Chance";
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
        if (_.isFinite(flno)){
            return flno;
        }
        return null;
    }
}

export default  new IntegerType();