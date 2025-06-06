import "reflect-metadata";
import {type ColumnParams} from "../types";
import {Model} from "../core/Model";
import Logger from "../utils/Logger";
import {cyan, blue} from "colorette";
import { Stash } from "../core/Stash";
import {type ColumnSchema, ModelMetaStore} from "./ModelMetaStore";

import {JsonType} from "../columns/JsonType";
import {ArrayType} from "../columns/ArrayType";
import {FloatType} from "../columns/FloatType";
import {IntegerType} from "../columns/IntegerType";
import {DateType} from "../columns/DateType";
import {BooleanType} from "../columns/BooleanType";
import {BaseType} from "../columns/BaseType";
import {EnumType} from "../columns/EnumType";

// any parameters, even optional ones!
export function Column(params?: ColumnParams) 
{
    return function (target: Model, propertyKey) {
        
        //const t = Reflect.getMetadata("design:type", target, propertyKey);
        var t = Reflect.getMetadata("design:type", target, propertyKey);
        //console.log(`${propertyKey} type: ${t.name}`);

        const className = target.constructor.name;

        if (!params){
            params = {};
        }
        
        //Logger.debug(className, propertyKey, params);

        // Handle case where we have no type passed in
        // and we look up type from member variable type
        const type = (params.type) ? params.type : t.name.toLowerCase();
        
        //Logger.debug(`Column type for ${className}.${propertyKey} is ${type}`);
        
        let isNumeric = false;
        if (type == 'number' || type == 'integer' || type == 'float' || type == 'date'){
            isNumeric = true;
        }

        const col:ColumnSchema = {
            name: propertyKey.trim(),
            type,
            isNumeric,
            index: params?.index || false,
            unique: params?.unique || false,
            default: params?.default,
            /*
            encode: (params.encode) ? params.encode : (val: any): string => {
                if (val === null || val === undefined) return '';
                if (type === 'json' || type === 'array') return JSON.stringify(val);
                if (val instanceof Date) return val.toISOString();
                return String(val);
            },
            decode: (params.decode) ? params.decode : (val: string): any => {
                if (!val) return null;
                if (type === 'json' || type === 'array') return JSON.parse(val);
                if (type === 'date') return new Date(val);
                if (isNumeric) return Number(val);
                return val;
            }
            */
        };

        //Logger.debug(`[${className}] Column schemd for ${propertyKey} (native type = ${t.name})`, col);

                            

        if (params.encode && typeof params.encode == 'function'){
            col.encode = params.encode;
        }
        else {
            switch(type){
                case 'json':
                    col.encode = JsonType.encode;
                    break;
                case 'array':
                    col.encode = ArrayType.encode;
                    break;
                case 'integer':
                    col.encode = IntegerType.encode;
                    break;
                case 'number': // default a number to a float
                case 'float':
                    col.encode = FloatType.encode;
                    break;
                case 'date':
                    col.encode = DateType.encode;
                    break;                    
                case 'boolean':
                    col.encode = BooleanType.encode;
                    break;                    
                default:
                    col.encode = BaseType.encode;
            }
        }

        if (params.decode && typeof params.decode == 'function'){
            col.decode = params.decode;
        }
        else {
            switch(type){
                case 'json':
                    col.decode = JsonType.decode;
                    break;
                case 'array':
                    col.decode = ArrayType.decode;
                    break;
                case 'integer':
                        col.decode = IntegerType.decode;
                    break;
                case 'number': // default a number to a float
                case 'float':
                    col.decode = FloatType.decode;
                    break;
                case 'date':
                    col.decode = DateType.decode;
                    break;                    
                case 'boolean':
                    col.decode = BooleanType.decode;
                    break;       
                default:
                    col.decode = BaseType.decode;              
            }
        }

        // Register the column in ModelMetaStore
        //Logger.debug(`Registering column ${className}.${propertyKey} (${col.type})`, col );
        ModelMetaStore.addColumn(className, col);


    };
}
