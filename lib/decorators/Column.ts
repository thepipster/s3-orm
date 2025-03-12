import "reflect-metadata";
import {type Field, type ColumnParams} from "../types";
import {Model} from "../core/Model";
import Logger from "../utils/Logger";
import {cyan, blue} from "colorette";
//import BaseType from "../types/BaseType";
//import BooleanType from "../types/BooleanType";

//export const ModelMeta = new Map<string, Map<string, Field>>();
export type FieldMetas = Map<string, Field>;
export const ModelMeta: FieldMetas[] = [];

// any parameters, even optional ones!
export function Column(params?: ColumnParams) 
{
    return function (target: Model, propertyKey) {
        
        const t = Reflect.getMetadata("design:type", target, propertyKey);
        const className = target.constructor.name;

        const field: Field = {
            name: propertyKey.trim(),
            type: t.name.toLowerCase(),
            isNumeric: false      
        };

        if (params && params.default){
            field.default = params.default;
        }

        // TODO: handle case where we have no type passed in
        // and we look up type from member variable type

        if (!ModelMeta[className]){
            ModelMeta[className] = new Map<string, Field>();
        }

        if (field.type == 'number' || field.type == 'integer' || field.type == 'float'){
            field.isNumeric = true;
        }

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

        ModelMeta[className].set(field.name, field);

        ModelMeta[className].forEach(function(fieldInfo, name){
            Logger.debug(`[${cyan(className)}] ${blue(name)}`, fieldInfo);        
        });
    };
}
