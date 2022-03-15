import _ from "lodash";
import BaseType from "./BaseType";
import Chance from "Chance";
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
        if (_.isFinite(flno)){
            return flno;
        }
        return null;
    }
}

export default  new FloatType();