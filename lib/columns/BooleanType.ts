import Logger from "../utils/Logger";
import Chance from "chance";
const chance = new Chance();

export class BooleanType  {  

    static isNumeric:boolean = false;
    static typeName:string = "boolean";
    
    static mock(){ 
        return chance.bool();
    }
    /**
     * Store boolean values as a 1 or 0 to save space
     * @param val 
     * @returns 
     */
    static encode(val: any): string{
        
        let res:string = '0';

        if (val == 'true'){
            res = '1';
        }
        else if (val === true){
            res = '1';
        }
        else if (val == 1){
            res = '1';
        }

        //Logger.debug(`BooleanType.encode ${val} --> ${res}`);

        return res;

    }
    static decode(val: string){ 
        if (val == '1'){
            return true;
        }
        return false;
    }
}

export default  new BooleanType();