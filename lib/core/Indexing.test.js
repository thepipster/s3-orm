
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger');
const chance = require('chance')();
const _ = require('lodash');
const Indexing = require('./Indexing.js');
const DataTypes = require('./DataTypes.js');
const Storm = require('../Storm.js');
const Engine = require('../engines/Engine.js');
const { getIdsForVal } = require('./Indexing.js');

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


    test('add/remove', async () => {
        
        const words = [
            'elephant',
            'fish',
            'gray wolf',
            'dog',
            'angry elephant',
            'wet fish',
            'gray wolf',
            'angry elephant',
            undefined,
            null,
            'frog',
            'frog'
        ];

        await Promise.map(words, async (word) => {
            await indx.add('testFieldName', word);
        });

        let idList = await getIdsForVal('testFieldName');

        expect(idList.length).toEqual(1);

        return;
    })

    /*
    test('set add/remove/clear', async () => {
        
        const setName = 'test-set';
        const no = _.random(4,8);
        const testId =  _.random(10,100);

        await s3.setClear(setName);

        let words = [];
        for (let i=0; i<no; i+=1){
            let tmp = chance.sentence({ words: 5 });
            words.push(tmp);
            await s3.setAdd(setName, testId, tmp);
        }

        // Now read back out to see if they were really set
        let tests = 0;
        await Promise.map(words, async (word) => {
            let res = await s3.setIsMember(setName, testId, word);
            tests += (res) ? 1 : 0;
        });

        expect(tests).toEqual(no);

        // Now read back out to see if they were really unset
        let tests2 = 0;
        await Promise.map(words, async (word) => {
            await s3.setRemove(setName, testId, word);
            let res = await s3.setIsMember(setName, testId, word);
            tests2 += (res) ? 1 : 0;
        });
        
        expect(tests2).toEqual(0);
        
        return;
    })

    test('setIntersectingVals()', async () => {
        
        const setNames = ['test-set-1', 'test-set-2', 'test-set-3'];
        const no = _.random(10,100);
        const testId =  _.random(10,100);

        let commonWords = [
            'abuga',
            'aguomakiz',
            'fed',
            'gerhav',
            'huktob',
            'iegosuh',
            'jabgonib',
            'zihtinop',
        ];

        // Add the words
        for (let j=0; j<setNames.length; j+=1){
            
            await s3.setClear(setNames[j]);

            // Add in random words, but make sure they are unique to that set
            // so we can test
            for (let k=0; k<5; k+=1){
                let word = chance.word() + '__' + setNames[j];
                await s3.setAdd(setNames[j], testId, word);            
            }

            // Add in common words
            await Promise.map(commonWords, async (word) => {
                await s3.setAdd(setNames[j], testId, word);     
            });
        }

        let inter = await s3.setIntersectingVals(setNames);
        
        expect(inter.length).toEqual(commonWords.length);

        // Clean up
        await Promise.map(setNames, async (setName) => {
            await s3.setClear(setName);
        });        
        
        return;
    })

    test.only('setIntersectingIds()', async () => {
        
        const setNames = ['test-ids-set-1', 'test-ids-set-2', 'test-ids-set-3'];
        let commonIds = [400, 620, 270, 750, 810]; // so any id below j*k should not be intersecting

        // Add the words
        for (let j=0; j<setNames.length; j+=1){
            
            await s3.setClear(setNames[j]);
            
            // Add in random words, but make sure they are unique to that set
            // so we can test
            for (let k=0; k<5; k+=1){
                let word = chance.word() + '__' + setNames[j];
                await s3.setAdd(setNames[j], k*10 + j, word);            
            }

            for (let k=0; k<commonIds.length; k+=1){
                let word = chance.word() + '__' + setNames[j];
                await s3.setAdd(setNames[j], commonIds[k], word);            
            }

        }

        let inter = await s3.setIntersectingIds(setNames);
        
        expect(inter.length).toEqual(commonIds.length);

        Logger.warn(inter);

        // Clean up
        await Promise.map(setNames, async (setName) => {
            await s3.setClear(setName);
        });        
        
        return;
    })
*/

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