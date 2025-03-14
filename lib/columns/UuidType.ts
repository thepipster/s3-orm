//import {uniqueId} from "lodash";
import Chance from "chance";
const chance = new Chance();

export class UuidType {
    
    static mock(){ 
        return chance.guid({version: 4});
    }
    
    static encode(val: any): string{   
        if (val === null || val === undefined) return '';
        return String(val);
    }

    static decode(val: any){         
        return val;
    }

}
