import {isNull, isUndefined} from "lodash";
import Logger from "../utils/Logger";

/**
 * A base class for a column type. We have to deal with 2 scenarios:
 * 2. encode() - We saving a valie to the database, so we need to encoded it into an internal value
 * 3. decode() - we are loading a value from the database, so we need to decode it back into a value
 */
export class BaseType {
    
    static isNumeric:boolean = false;
    static typeName:string = "base";   

    static mock(){
        return null;
    }
    
    static encode(val: any): string{   
        if (val === null || val === undefined) return '';
        return String(val);
    }

    static decode(val: any){         
        return val;
    }
}