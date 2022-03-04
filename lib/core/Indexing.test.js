
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger');
const chance = require('chance')();
const _ = require('lodash');
const Indexing = require('./Indexing.js');
const DataTypes = require('./DataTypes.js');
const Storm = require('../Storm.js');
const Engine = require('../engines/Engine.js');

const s3 = new Engine({acl:'public-read'});
const storm = new Storm(s3);

const modelName = 'test-model';
const Model = storm.define(modelName, {
    email: DataTypes.String,
    fullName: DataTypes.String,
    lastIp: DataTypes.String,
    lastLogin: DataTypes.Date,    
    preferences: DataTypes.Json, 
    tags: DataTypes.Array, 
    level: { type: DataTypes.String, default: 'user' },
    status: { type: DataTypes.String, default: 'active' }
}, {expires: 100});

const indx = new Indexing(null, Model._name(), Model._model(), s3);

describe('Indexing', () => {

    /*
    beforeAll((done) => {
        done();
    })
*/

    afterAll(async () => {
        // Clean up
        return;
    })
    

    test('max id', async () => {
        
        const testId = 1;
        await indx.setMaxId(testId);

        let id = await indx.getMaxId();

        expect(id).toEqual(testId)

        return;
    })


    test('unique', async () => {
        
        await indx.clearUniques('tags');
        
        const key = Indexing.getIndexName(modelName, 'tags');

        const vals = [
            'elephant',
            'fish',
            'wolf',
            'dog',
            'elephant',
            'fish',
            'elephant',
            undefined,
            null,
            'frog',
            'frog'
        ];

        for (let i=0; i<vals.length; i+=1){
            try {
                await indx.addUnique('tags', vals[i]);
            }
            catch(err){
                Logger.error(err.toString());
            }
        }


        let setList = await indx.getUniques('tags');
        //let uniqueList = _.uniq(vals);

        Logger.debug('setList = ', setList)
        //Logger.debug('uniqueList = ', uniqueList)

        expect(setList.length).toEqual(5);
        expect(await indx.isUnique('tags', 'fish')).toEqual(true);
        expect(await indx.isUnique('tags', 'tiger')).toEqual(false);
        expect(await indx.isUnique('tags', null)).toEqual(false);
        expect(await indx.isUnique('tags', undefined)).toEqual(false);

        return;
    })    

});