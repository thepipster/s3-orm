import "reflect-metadata";

import {type Field, type ColumnParams} from "../types";
import {Model} from "../core/Model";
import Logger from "../utils/Logger";
import chalk from "chalk";

//export const ModelMeta = new Map<string, Field[]>();
export const ModelMeta: Field[] = [];

// any parameters, even optional ones!
export function Column(params?: ColumnParams) 
{
    return function (target: Model, propertyKey) {
        
        const t = Reflect.getMetadata("design:type", target, propertyKey);
        const className = target.constructor.name;

        const field: Field = {
            name: propertyKey.trim(),
            type: t.name.toLowerCase()            
        };

        if (params && params.defaultValue){
            field.defaultValue = params.defaultValue;
        }

        if (!ModelMeta[className]){
            ModelMeta[className] = [];
        }

        ModelMeta[className].push(field);

        //console.log(`---------- ${className} ------------`);
        //console.log('target = ', target);
        //console.log('target.constructor = ', target.constructor);
        //console.log('target.constructor.id = ', target.id);
        //console.log(`[${className}] ${propertyKey} type: ${t.name}`);
        ModelMeta[className].forEach(function(fieldInfo, name){
            Logger.debug(`[${chalk.cyan(className)}] ${chalk.blueBright(name)}`, fieldInfo);        
        });

    };
}
