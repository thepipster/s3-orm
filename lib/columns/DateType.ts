import {isFinite} from "lodash";
import Chance from "chance";
const chance = new Chance();
import Logger from "../utils/Logger";

export class DateType  {

    static isNumeric:boolean = true;
    static typeName:string = "date";
    
    static mock(){ 
        return chance.date();
    }

    /**
     * Covnert the date to an epoch timestamp for storage
     */
    static encode(val: Date | string): string { 
        
        if (!val || val === null || val === undefined) {
            return '0';
        }

        if (typeof val == "string") {
            val = new Date(val);
        }

        if (val instanceof Date) {
            //return val.toISOString();
            return new Date(val).getTime()+'';
        }

        //Logger.error(`Trying to encode a date column and got an invalid date value: ${val}`, val);
        throw new Error(`Trying to encode a date column and got an invalid date value: ${val}`);

    }

    /**
     * Extract the epoch time stamp and convert back to a date
     * @param val This will be the epoch, but as a string
     * @returns 
     */
    static decode(val: string) {    
        
        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a date column and got an invalid date value: ${val}`);
        }

        let epoch:number = parseInt(val);

        if (isFinite(epoch)){
            return new Date(epoch)
        }
        
        return null;   
    }   
}