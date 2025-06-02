import Chance from "chance";
const chance = new Chance();

export class IdType {

    //private static idCounters: Map<string, number> = new Map();
    static isNumeric:boolean = true;
    static typeName:string = "id";
    
    static mock(){ 
        return chance.integer({ min: 1, max: 20000 })
    }

    static encode(val: any): string{   
        if (val === null || val === undefined) {
            throw new Error('The id value cannot be null or undefined');
        }
        return String(val);
    }

    static decode(val: any){         

        if (!val || val === null || val === undefined) {
            throw new Error(`Trying to load a id column and got an invalid value: ${val}`);
        }

        let numb:number = parseInt(val);

        if (isFinite(numb)){
            return numb;
        }

        return null;

    }

}

export default  new IdType();