/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../utils/logger')
const Storm = require('../Storm.js');
const Engine = require('../Engine.js');
const DataTypes = require('../DataTypes.js');

// uuid: { type: DataTypes.String, default: uuidv4}, 

// Pass in the engine, this allows swapping out the back-end DB 
//const s3 = new ClientEngine();
const s3 = new Engine({acl:'public-read'});
const storm = new Storm(s3);

setTimeout( async ()=> {

    const Model = storm.define('basic-model', {
        email: DataTypes.String,
        fullName: DataTypes.String,
        lastIp: DataTypes.String,
        lastLogin: DataTypes.Date,    
        preferences: DataTypes.Json, 
        level: { type: DataTypes.String, default: 'user' },
        status: { type: DataTypes.String, default: 'active' }
    }, {expires: 100});
    
    
    let tmp = new Model({
        email: 'test@asgsdghs.com',
        fullName: 'mikeypoio',
        lastIp: '657.326.236.346',
        lastLogin: new Date(),
        preferences: {
            stuff: 'chips',
            moreStuff: 'fish'
        }
    });

    Logger.debug(`Created model called ${Model._name()}`);

    //Logger.debug(Model._model());
    //Logger.debug(tmp.toJson());

    await tmp.save();

}, 100);



