
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger')
const Storm = require('../Storm.js');
const Engine = require('../engines/Engine.js');
const DataTypes = require('../core/DataTypes.js');
const _ = require('lodash');
const Chance = require('chance');

const chance = new Chance();

// uuid: { type: DataTypes.String, default: uuidv4}, 

// Pass in the engine, this allows swapping out the back-end DB 
//const s3 = new ClientEngine();
const s3 = new Engine({acl:'public-read'});
const storm = new Storm(s3);

setTimeout( async ()=> {

    const Model = storm.define('basic-model', {
        email: DataTypes.String,
        age: {type: DataTypes.Integer, index: true},
        fullName: DataTypes.String,
        lastIp: DataTypes.String,
        lastLogin: DataTypes.Date,    
        preferences: DataTypes.Json, 
        tags: DataTypes.Array, 
        level: { type: DataTypes.String, default: 'user' },
        status: { type: DataTypes.String, default: 'active' }
    }, {expires: 100});
    
    
    let tmp = new Model({
        email: chance.email(),
        fullName: chance.name({ nationality: 'en' }),
        lastIp: chance.ip(),
        lastLogin: chance.date(),
        tags: chance.n(chance.word, 5),
        preferences: {
            stuff: chance.word(),
            moreStuff: chance.word()
        }
    });

    Logger.debug(`Created model called ${Model._name()}`);


    let test = Model.generateMock();

    Logger.debug(test.toJson());
    //Logger.debug(Model._model());
    //Logger.debug(tmp.toJson());

    //await tmp.save();

    Logger.debug(`Saved with id = ${tmp.id}`);

}, 100);



