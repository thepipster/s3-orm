import "reflect-metadata";
import {type EntityParams} from "../types";
import {Model} from "../core/Model";
import Logger from "../utils/Logger";
import chalk from "chalk";

//export const ModelMeta = new Map<string, Field[]>();
export const ModelOptions: EntityParams[] = [];

// any parameters, even optional ones!
export function Entity(params?: EntityParams) : ClassDecorator {
    return function (target: Function) {
        
        // Apply the parameters to the target class
        //target.prototype.entityParams = params;
        console.log(params);

        //const t = Reflect.getMetadata("design:type", target, propertyKey);
        //const className = target.constructor.name;

        //Logger.debug(`[${chalk.cyan(className)}] ${chalk.blueBright(propertyKey)}`, target);
        /*
        `[${chalk.cyan(className)}] ${chalk.blueBright(name)}`

        if (!ModelOptions[className]){
            ModelOptions[className] = [];
        }

        ModelOptions[className].push(field);

        //console.log(`---------- ${className} ------------`);
        console.log('target = ', target);
        console.log('target.constructor = ', target.constructor);
        console.log('target.constructor.id = ', target.id);
        console.log(`[${className}] ${propertyKey} type: ${t.name}`);
        ModelMeta[className].forEach(function(fieldInfo, name){
            console.log(`[${className}] ${name}`, fieldInfo);        
        });
        */

    };
}
