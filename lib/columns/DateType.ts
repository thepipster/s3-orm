import {isFinite} from "lodash";
import Chance from "chance";
const chance = new Chance();

export class DateType  {

    static isNumeric:boolean = true;
    static typeName:string = "date";
    
    static mock(){ 
        return chance.date();
    }
    /**
     * To save space, we store dates as epoch timestamps
     * @param val 
     * @returns 
     */
    static encode(val: Date): string { 
        
        if (!val || val === null || val === undefined) {
            return '0';
        }

        if (val instanceof Date) {
            //return val.toISOString();
            return new Date(val).getTime()+'';
        }

        throw new Error(`Trying to save a date column and got an invalid date value: ${val}`);

    }

    /**
     * Extract the epoch time stamp and convert back to a date
     * @param val 
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