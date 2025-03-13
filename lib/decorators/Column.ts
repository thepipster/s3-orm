import "reflect-metadata";
import {type ColumnParams} from "../types";
import {Model} from "../core/Model";
import Logger from "../utils/Logger";
import {cyan, blue} from "colorette";
import { Storm } from "../core/Storm";
import {type ColumnSchema, ModelMetaStore} from "./ModelMetaStore";

//import BaseType from "../types/BaseType";
//import BooleanType from "../types/BooleanType";


// any parameters, even optional ones!
export function Column(params?: ColumnParams) 
{
    return function (target: Model, propertyKey) {
        
        //const t = Reflect.getMetadata("design:type", target, propertyKey);
        const className = target.constructor.name;

        //Logger.debug(className, propertyKey, params);

        // Handle case where we have no type passed in
        // and we look up type from member variable type
        const type = (params.type) ? params.type : typeof target[propertyKey];
        
        let isNumeric = false;
        if (type == 'number' || type == 'integer' || type == 'float'){
            isNumeric= true;
        }

        const col:ColumnSchema = {
            name: propertyKey.trim(),
            type,
            isNumeric,
            index: params?.index || false,
            unique: params?.unique || false,
            default: params?.default,
            toString: (val: any): string => {
                if (val === null || val === undefined) return '';
                if (type === 'json' || type === 'array') return JSON.stringify(val);
                if (val instanceof Date) return val.toISOString();
                return String(val);
            },
            fromString: (val: string): any => {
                if (!val) return null;
                if (type === 'json' || type === 'array') return JSON.parse(val);
                if (type === 'date') return new Date(val);
                if (isNumeric) return Number(val);
                return val;
            }
        };

        // Register the column in ModelMetaStore
        ModelMetaStore.addColumn(className, col);


    };
}
