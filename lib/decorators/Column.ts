import "reflect-metadata";
import {type ColumnParams} from "../types";
import {Model} from "../core/Model";
import Logger from "../utils/Logger";
import {cyan, blue} from "colorette";
import { Storm } from "../core/Storm";
import {type ColumnSchema} from "./ModelMetaStore";

//import BaseType from "../types/BaseType";
//import BooleanType from "../types/BooleanType";


// any parameters, even optional ones!
export function Column(params?: ColumnParams) 
{
    return function (target: Model, propertyKey) {
        
        const t = Reflect.getMetadata("design:type", target, propertyKey);
        const className = target.constructor.name;

        // Handle case where we have no type passed in
        // and we look up type from member variable type
        const type = (t.type) ? t.type : typeof target[propertyKey];

        let isNumeric = false;
        if (type == 'number' || type == 'integer' || type == 'float'){
            isNumeric= true;
        }

        const col:ColumnSchema = {
            name: propertyKey.trim(),
            isNumeric,  
            index: (t.index) ? t.index : null,       
            unique: (t.unique) ? t.unique : null,       
            default: (t.default) ? t.default : null,       
            toString: (val: any): string => {
                return JSON.stringify(val);
            },
            fromString: (val: string): any => {
                return JSON.parse(val);
            }
        };


        if (Storm.debug){
            Logger.debug(`[${cyan(className)}] ${blue(propertyKey)}`, t);        
        }
/*
        const field: ColumnSchema = {
            name: propertyKey.trim(),
            type: t.name.toLowerCase(),
            isNumeric: false      
        };

        if (params && params.default){
            field.default = params.default;
        }



        if (!ModelMeta[className]){
            ModelMeta[className] = new Map<string, Field>();
        }

        if (field.type == 'number' || field.type == 'integer' || field.type == 'float'){
            field.isNumeric = true;
        }
*/
        // TODO: Add in support for timestamp fields
        /*
        if (!extendedSchema['created']){
            extendedSchema.created = {
                type: DataTypes.Date,
                index: true,
                defaultValue: function () {
                    return new Date();
                },
            };    
        }

        if (!extendedSchema['modified']){
            extendedSchema.modified = {
                type: DataTypes.Date,
                onUpdateOverride: function () {
                    return new Date();
                },
            };    
        }
        */
/*
        ModelMeta[className].set(field.name, field);

        ModelMeta[className].forEach(function(fieldInfo, name){
            Logger.debug(`[${cyan(className)}] ${blue(name)}`, fieldInfo);        
        });
        */
    };
}
