import {isFinite} from "lodash";
import Chance from "chance";
const chance = new Chance();

export class FloatType {
    
    static isNumeric:boolean = true;
    static typeName:string = "float";
    
    static mock(){ 
        return chance.floating({ min: 0, max: 1000000});
    }

    static encode(val: any): string { 

        if (!val || val === null || val === undefined) {
            return '';
        }

        return val+'';
        
    }

    static decode(val: string):number {    

        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a float column and got an invalid value: ${val}`);
        }

        let numb:number = parseFloat(val);

        if (isFinite(numb)){
            return numb;
        }

        return null;

    }
}