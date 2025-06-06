import Chance from "chance";
const chance = new Chance();
import Logger from "../utils/Logger";

export class JsonType { 

    static isNumeric:boolean = false;
    static typeName:string = "json";

    static mock(){ 
        return {
            a: chance.integer({ min: -200, max: 200 }),
            b: chance.name(),
            c: chance.d100(),
            d: chance.floating({ min: 0, max: 1000})    
        }
    }

    static encode(val: any): string { 
        //Logger.debug(`Encoded json to >>${JSON.stringify(val)}<< from `, val);
        return JSON.stringify(val);
    }

    static decode(val: string) {    
        try {
            //Logger.debug(`Decodeed json to >>${val}<< from `, JSON.parse(val));
            return JSON.parse(val);
        }
        catch(err){
            Logger.error(`Error decoding json string ${val}`);
        }
        return null        
    }        
}
