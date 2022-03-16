import BaseModel from "./Model.js";
import DataTypes from "../types/index.js";
import {isObject} from "lodash";
import Engine from "./Engine";
import Logger from "../utils/Logger";

class Storm {

    constructor(opts){
        this.meta = {};
        this.s3 = new Engine(opts);
    }

    async listModels(){
        return await this.s3.setMembers('meta');
    }

    /**
     * Load all model schemas
     * @returns 
     */
    async getSchemas(){

        let list = await this.listModels();
        this.meta = {};
		
        for (let i = 0; i < list.length; i += 1) {
			let name = list[i];
            let meta = await this.s3.setGetMeta('meta', name);
			this.meta[name] = JSON.parse(meta);
            Logger.debug(this.meta[name]);
       	}

        return this.meta;

    }    

    /**
     * Factory method to create a new instance of a S3 ORM (aka Storm) Model
     * 
     * The model schema should look like;
     *
     *  [
     *      id: {type: DataTypes.Number, index:true},
     *      noUsersInGame: {type: DataTypes.Number, defaultValue:0},
     *      noUsers: {type: DataTypes.Number, defaultValue:0},
     *      isStarted: {type: DataTypes.Number, defaultValue: 0},clear
     *      startTime: {type: 'date', defaultValue: ()=>{return Date.now()}}
     *      currentQuestionId: {type: DataTypes.Number, defaultValue: 0},
     *      questionIds: {type:'array', default: []}
     *  ]
     *
     * @param {string} name The model name
     * @param {object} schema The model schema
     */
    define(name, schema, options){

        const self = this;

        var extendedSchema = {};
        
        if (this.s3.authenticated && this.s3.setAdd){
            // Add table name and schema to meta info, but we don't need to wait
            this.s3.setAdd('meta', name, JSON.stringify(schema));
        }

        this.meta[name] = schema;

        // Support for field meta data being passed as a simple type, i.e.
        // 
        // fullName: DataTypes.String,
        // vs
        // level: { type: DataTypes.String }
        //        
        for (let key in schema){
            if (!isObject(schema[key])){
                extendedSchema[key] = {type: schema[key]};
            }
            else {
                extendedSchema[key] = schema[key];
            }
        }

        // Enforce a type for the id
        extendedSchema.id = {
            type: DataTypes.Id,
            index: true
        };  

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

        class Model extends BaseModel {

            constructor(data) {
                super(data);
            }
        
            static _opts(){
                return (options) ? options : {}
            }

            static _name(){
                return name
            }

            static _model(){
                return extendedSchema
            }

            static _schema(){
                return extendedSchema
            }            

        }

        Model.s3 = this.s3;

        return Model;
    }

}

export default Storm;
