import {type ColumnParams} from "../types";
import { Storm } from "../core/Storm";
import Logger from "../utils/Logger";
import {cyan, blue} from "colorette";
import {type callback, type EntityParams} from "../types";
import {IdType} from "../columns/IdType";

// This is basically an extended version of ColumnParams, but is used 
// internally only. This allows us to add a encode/decode methods 
// and other standard properties we don't want/need to expose publicly
export type ColumnSchema = ColumnParams & {
    name: string,
    isNumeric: boolean
}


export type ModelSchema = {
    [key: string]: ColumnSchema;
}

export class ModelMetaStore {

    private static store: Map<string, ModelSchema> = new Map();
    private static entityMetas: Map<string, EntityParams> = new Map();

    static addColumnMeta(modelName: string, meta: EntityParams){
        this.entityMetas.set(modelName, meta);
    }

    /**
     * Get the schema (meta data) for the given column and model
     * @param modelName
     * @param columnName 
     * @returns 
     */
    static getColumn(modelName: string, columnName: string): ColumnSchema {
        
        if (!this.store.has(modelName)){
            throw new Error(`Model ${modelName} not found!`);
        }

        const col:ModelSchema = this.store.get(modelName);

        if (!col[columnName]){
            throw new Error(`Model ${modelName} not no column called ${columnName}!`);
        }       
        
        return col[columnName];
    }

    static hasColumn(modelName: string, columnName: string): boolean {
        
        if (!this.store.has(modelName)){
            throw new Error(`Model ${modelName} not found!`);
        }

        const col:ModelSchema = this.store.get(modelName);

        if (!col[columnName]){
            return false;
        }       
        
        return true;
    }

    static get(modelName: string): ModelSchema {

        if (!this.store.has(modelName)){
            throw new Error(`Model ${modelName} not found!`);
        }

        return this.store.get(modelName);
     
    }

    static addColumn(modelName: string, meta: ColumnSchema){

        // This is the first time we are adding a column to this model
        if (!this.store.has(modelName)){

            // By default, we add the id column
            const idCol:ColumnSchema = {
                name: 'id',
                type: 'integer',
                isNumeric: true,
                index: true,
                unique: true,
                encode: IdType.encode,
                decode: IdType.decode
            };

            this.store.set(modelName, {id: idCol});
        }

        const col:ModelSchema = this.store.get(modelName);
        col[meta.name] = meta;

        if (Storm.debug){
            //col.forEach(function(fieldInfo: ColumnSchema, name: string){
            //    Logger.debug(`[${cyan(modelName)}] ${blue(name)}`, fieldInfo);        
            //});    
        }

    }
}