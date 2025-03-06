
"use strict";

import Logger from "../utils/Logger";
import _ from "lodash";
import Chance from "chance";
import {Storm, DataTypes} from "../../index";

const chance = new Chance();

// uuid: { type: DataTypes.String, default: uuidv4}, 

// Pass in the engine, this allows swapping out the back-end DB 
const storm = new Storm();

setTimeout( async ()=> {


    const models = await storm.listModels();
    Logger.debug(`Models = `, models);
/*
    const Model = storm.define('basic-model', {
        email: {type: DataTypes.String, index: true},
        age: {type: DataTypes.Integer, index: true},
        score: {type: DataTypes.Float, index: true},
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

    for (let i=0; i<list.length; i+=1){
        let obj = await s3.getObject(list[i]);
        Logger.debug(obj.email);
    }

    Logger.debug(`Found ${list.length} items`);

    
    if (list.length < No){
        for (let i=0; i<No; i+=1){
            let tmp = new Model({
                email: chance.email(),
                age: (i==0) ? 20 : chance.age(),
                score: (i==0) ? 50.56 : chance.floating({ min: 0, max: 100 }),
                fullName: (i==0) ? 'Bob The Builder' : chance.name({ nationality: 'en' }), 
                lastIp: chance.ip(),
                lastLogin: chance.date(),
                tags: chance.n(chance.word, 5),
                preferences: {
                    stuff: chance.word(),
                    moreStuff: chance.word()
                }
            });
            try {
                await tmp.save();
            }
            catch(err){
                Logger.error(err.toString());
            }
            Logger.debug(`[${Model._name()}] Saved with id = ${tmp.id}`, tmp.email);
        }
    }
    
    let objectList = await Model.find({});

    let tmp = new Model(Model.generateMock());
    tmp.email = objectList[0].email;
    await tmp.save();


    //await Model.resetIndex();

    //let qry = {fullName: 'bob'};
    //let qry = {fullName: 'ob'};
    //let qry = {age: 20};
    //let qry = {age: {$gte: 19}};
    //let qry = {fullName: 'bob', age: {$gte: 19}};
    let qry = {score: 50.56};

    let items = await Model.getIds(qry);
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
    
    //for (let i=0; i<objectList.length; i+=1){
    //    const obj = objectList[i];
    //    await obj.remove();
   // }
    
   let modelNames = await storm.listModels();
   Logger.debug('model names = ', modelNames);
*/

}, 100);



