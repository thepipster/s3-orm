import {isFinite} from "lodash";
import Chance from "chance";
const chance = new Chance();

export class IntegerType  {
    static mock(){ 
        return chance.integer({ min: -20000, max: 20000 });
    }
    static encode(val: any): string { 

        if (!val || val === null || val === undefined) {
            return '';
        }

        return val+'';
        
    }

    static decode(val: string) {    

        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a integer column and got an invalid value: ${val}`);
        }

        let numb:number = parseInt(val);

        if (isFinite(numb)){
            return numb;
        }

        return null;

    }
}
