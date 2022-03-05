const Logger = require('./utils/logger')
const BaseModel = require('./models/BaseModel');
const DataTypes = require('./core/DataTypes');
const _ = require('lodash');

class Storm {

    constructor(s3){
        this.s3engine = s3;
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
     *      isStarted: {type: DataTypes.Number, defaultValue: 0},
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

        // Support for field meta data being passed as a simple type, i.e.
        // 
        // fullName: DataTypes.String,
        // vs
        // level: { type: DataTypes.String }
        //        
        for (let key in schema){
            if (!_.isObject(schema[key])){
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

        };

        Model.s3 = this.s3engine;

/*
        Model._name = () => {
            return name;
        }

        Model._model = () => {
            return schema;
        }

        Model._model = () => {
            return schema;
        }        
        */

        return Model;
    }

}

module.exports = Storm;