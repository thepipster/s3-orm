
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger')
const Storm = require('../Storm.js');
const Engine = require('../engines/Engine.js');
const DataTypes = require('../types');
const _ = require('lodash');
const Chance = require('chance');
const Promise = require("bluebird");

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
    
    const No = 10;
    let list = await s3.listObjects('basic-model');

    Logger.debug(`Found ${list.length} items`);

    if (list.length < No){
        for (let i=0; i<No; i+=1){
            let tmp = new Model({
                email: chance.email(),
                age: (i==0) ? 20 : chance.age(),
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
    }
    

    //await Model.resetIndex();

    //let qry = {fullName: 'bob'};
    //let qry = {fullName: 'ob'};
    //let qry = {age: 20};
    //let qry = {age: {$gte: 19}};
    //let qry = {fullName: 'bob', age: {$gte: 19}};
    let qry = {};

    let items = await Model.find(qry);
    Logger.debug('query = ', qry);
    Logger.debug('result = ', items);


    //let names = await Model.distinct('fullName', qry);
    //Logger.debug(names)


    let ages = await Model.max('age');
    Logger.debug('ages = ', ages)

    //let indx = Indexing()

    //let idList = Indexing.getIdsForVal();

    //let test = Model.generateMock();

    //Logger.debug(test.toJson());
    //Logger.debug(Model._model());
    //Logger.debug(tmp.toJson());

    //await tmp.save();

    // Now delete
    /*
    for (let i=0; i<objectList.length; i+=1){
        const obj = objectList[i];
        await obj.remove();
    }
    */


}, 100);



