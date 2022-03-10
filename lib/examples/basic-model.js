
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
    

    let list = await s3.listObjects('basic-model');

    if (list.length < 5){
        for (let i=0; i<5; i+=1){
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
    
    list = await s3.listObjects('basic-model');
    let dataList = [];
    let objectList = [];
    
    for (let i=0; i<list.length; i+=1){
        let key = list[i];
        Logger.debug(`Loading ${key}`);
        let rawData = await s3.getObject(key);
        let data = Model.__parseObjectFromS3(rawData);
        Logger.debug(data);
        let obj = await Model.loadFromId(data.id);
        dataList.push(data);
        objectList.push(obj);
    }


    //await Model.resetIndex();

    //let qry = {fullName: 'bob'};
    //let qry = {fullName: 'ob'};
    //let qry = {age: 25};
    let qry = {age: {$gte: 19}};
    //let qry = {fullName: 'bob', age: {$gte: 19}};
    
    let items = await Model.findOne(qry);
    Logger.debug('query = ', qry);
    Logger.debug('result = ', items);

    //let indx = Indexing()

    //let idList = Indexing.getIdsForVal();

    //let test = Model.generateMock();

    //Logger.debug(test.toJson());
    //Logger.debug(Model._model());
    //Logger.debug(tmp.toJson());

    //await tmp.save();
/*
    // Now delete
    for (let i=0; i<objectList.length; i+=1){
        const obj = objectList[i];
        await obj.remove();
    }
*/

}, 100);



