
"use strict";

import Logger from "../utils/Logger";
import Chance from "chance";
import {random, map} from "lodash";
import Indexing from "./Indexing.js";
import DataTypes from "../types";
import Storm from "./Storm.js";
import {AwsEngine} from "../engines/AwsEngine.js";

const s3 = new AwsEngine({acl:'public-read'});
const storm = new Storm(s3);
const chance = new Chance();

const modelName = 'testing-index-model';
const TestModel = storm.define(modelName, {
    age: {type: DataTypes.Integer, index: true},
    animal: {type: DataTypes.String, index: true},
    uniqueAnimal: {type: DataTypes.String, unique: true},
    lastLogin: {type: DataTypes.Date, index: true},
    preferences: {type: DataTypes.Json, index: true},
    tags: {type: DataTypes.Array, index: true}
});

const indx = new Indexing(555, TestModel._name(), TestModel._schema(), s3);

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
    
    test('stringify/parse', async () => {
        
        const testWord = chance.sentence({words:5});
        const encodedStr = indx.stringify('animal', testWord);
        const parsedStr = indx.parse('animal', encodedStr);
        
        expect(encodedStr).toEqual(testWord)
        expect(parsedStr).toEqual(parsedStr)

        return;
    })


    test('max id', async () => {
        
        const testId = random(10000,999999999);
        await indx.setMaxId(testId);

        let id = await indx.getMaxId();

        expect(id).toEqual(testId)

        return;
    })
/*

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
*/
    test('unique', async () => {
        
        var vals = ['elephant', 'fish', 'wolf', 'dog'];
        const fieldName = 'uniqueAnimal';

        await indx.clearUniques(fieldName);
        let setList = await indx.getUniques(fieldName);
        expect(setList.length).toEqual(0);
        
        for (let i=0; i<vals.length; i+=1){
            try {
                await indx.addUnique(fieldName, vals[i]);
            }
            catch(err){
                Logger.error(err.toString());
            }
        }


        setList = await indx.getUniques(fieldName);
        expect(setList.length).toEqual(vals.length);

        expect(await indx.isMemberUniques(fieldName, 'fish')).toEqual(true);
        expect(await indx.isMemberUniques(fieldName, 'tiger')).toEqual(false);
        

        return;
    })        


    test('numeric', async () => {
        
        var vals = [1, 5, 7, 2, 200, -46, 23634634563463, -23463463456];
        const fieldName = 'age';

        await indx.clearNumerics(fieldName);
        let setList = await indx.getNumerics(fieldName);
        expect(setList.length).toEqual(0);
        
        for (let i=0; i<vals.length; i+=1){
            try {
                await indx.addNumeric(fieldName, vals[i]);
            }
            catch(err){
                Logger.error(err.toString());
            }
        }


        setList = await indx.getNumerics(fieldName);
        expect(setList.length).toEqual(vals.length);

        vals.sort();
        let scores = map(setList, 'score');

        for (let i=0; i<scores.length; i+=1){
            expect(scores[i]).toEqual(vals[i]);
        }

        return;
    })


    test('string', async () => {
        
        var vals = ['elephant', 'fish', 'wolf', 'dog'];
        const fieldName = 'animal';

        await indx.clear(fieldName);
        let setList = await indx.list(fieldName);
        expect(setList.length).toEqual(0);
        
        for (let i=0; i<vals.length; i+=1){
            try {
                await indx.add(fieldName, vals[i]);
            }
            catch(err){
                Logger.error(err.toString());
            }
        }


        setList = await indx.list(fieldName);
        expect(setList.length).toEqual(vals.length);
        let resVals = map(setList, 'val');

        vals = vals.sort();
        Logger.debug(vals);
        Logger.debug(resVals);

        for (let i=0; i<resVals.length; i+=1){
            expect(resVals[i]).toEqual(vals[i]);
        }

        return;
    })


    /*
    test('set add/remove/clear', async () => {
        
        const setName = 'test-set';
        const no = random(4,8);
        const testId =  random(10,100);

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
        const no = random(10,100);
        const testId =  random(10,100);

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



});