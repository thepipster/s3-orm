
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger')
const Storm = require('../Storm.js');
const Engine = require('../engines/Engine.js');
const DataTypes = require('../core/DataTypes.js');
const _ = require('lodash');
const Chance = require('chance');
const Indexing = require('../core/Indexing');

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
        fullName: {type: DataTypes.String, index: true},
        lastIp: DataTypes.String,
        lastLogin: {type: DataTypes.Date, index: true},  
        preferences: DataTypes.Json, 
        tags: DataTypes.Array, 
        level: { type: DataTypes.String, default: 'user', index: true },
        status: { type: DataTypes.String, default: 'active' }
    }, {expires: 100});
    
    /*
    for (let i=0; i<5; i+=1){
        let tmp = new Model({
            email: chance.email(),
            fullName: (i==0) ? 'Bob The Builder' : chance.name({ nationality: 'en' }), 
            lastIp: chance.ip(),
            lastLogin: chance.date(),
            tags: chance.n(chance.word, 5),
            preferences: {
                stuff: chance.word(),
                moreStuff: chance.word()
            }
        });
        await tmp.save();
        Logger.debug(`[${Model._name()}] Saved with id = ${tmp.id}`);
    }
    */

    await Model.resetIndex();
    
    let items = await Model.getIds({fullName: 'bob'});
    Logger.warn(items);

    items = await Model.getIds({fullName: 'ob'});
    Logger.warn(items);
    
    items = await Model.getIds({age: 25});
    Logger.warn(items);

    items = await Model.getIds({age: {$gte: 12}});
    Logger.warn(items);

    //let indx = Indexing()

    //let idList = Indexing.getIdsForVal();

    //let test = Model.generateMock();

    //Logger.debug(test.toJson());
    //Logger.debug(Model._model());
    //Logger.debug(tmp.toJson());

    //await tmp.save();


}, 100);



