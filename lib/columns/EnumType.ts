import Logger from "../utils/Logger";
import Chance from "chance";
const chance = new Chance();

export class EnumType {  
    
    static isNumeric:boolean = false; 
    static typeName:string = "enum";   
    
    static mock(){ 
        return chance.n(chance.word, 5);
    }

    static encode(val: any): string { 
        return JSON.stringify(val);
    }

    static decode(val: string) {     
        try {
            return JSON.parse(val);
        }
        catch(err){
            Logger.error(`Error decoding json string ${val}`);
        }
        return null            
    }   
}
