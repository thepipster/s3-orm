
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger');
const chance = require('chance')();
const _ = require('lodash');
const Engine = require('./Engine.js');
const s3 = new Engine();
const Promise = require('bluebird');

describe('Engine', () => {

    /*
    beforeAll((done) => {
        done();
    })
*/

    afterAll(async () => {
        // Clean up
        return;
    })
    

    test('setAdd()', async () => {
        
        const setName = 'test-set';
        const no = _.random(4,8);

        let words = [];
        for (let i=0; i<no; i+=1){
            let tmp = chance.sentence({ words: 5 });
            words.push(tmp);
        }

        await Promise.map(words, async (word) => {
            await s3.setAdd(setName, word);
        });

        // Now read back out to see if they were really set
        let tests = 0;
        await Promise.map(words, async (word) => {
            let res = await s3.setIsMember(setName, word);
            tests += (res) ? 1 : 0;
        });

        expect(tests).toEqual(no);

        // Now read back out to see if they were really unset
        let tests2 = 0;
        await Promise.map(words, async (word) => {
            await s3.setRemove(setName, word);
            let res = await s3.setIsMember(setName, word);
            tests2 += (res) ? 1 : 0;
        });
        
        expect(tests2).toEqual(0);
        
        return;
    })

    test('setIntersection()', async () => {
        
        const setNames = ['test-set-1', 'test-set-2', 'test-set-3'];
        const no = _.random(10,100);

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
            
            let words = [];
            for (let i=0; i<no; i+=1){
                words.push(chance.word() + '_' + i);
            }

            // Add in common words
            await Promise.map(words, async (word) => {
                await s3.setAdd(setNames[j], word);            
            });

            // Add in common words
            await Promise.map(commonWords, async (word) => {
                await s3.setAdd(setNames[j], word);     
            });
        }

        let inter = await s3.setIntersection(setNames);
        
        expect(inter.length).toEqual(commonWords.length);

        // Clean up
        await Promise.map(setNames, async (setName) => {
            await s3.setClear(setName);
        });        
        
        return;
    })

    test('ordered set add/remove', async () => {

        const setName = 'zset-test2';
        await s3.zSetClear(setName);

        // Test adding
        let word = 'add/remove test ' + chance.sentence({ words: 5 });
        await s3.zSetAdd(setName, 0, word);

        // check it got added
        let items = await s3.zSetMembers(setName);
        expect(items.length).toEqual(1);

        // Test removing
        await s3.zSetRemove(setName, word);

        // check it got removed
        items = await s3.zSetMembers(setName);
        expect(items.length).toEqual(0);
        
        

    })

    test('ordered set query', async () => {

        const setName = 'zset-test';
        await s3.zSetClear(setName);

        const no = 8;
        let words = [];
        for (let i=0; i<no; i+=1){
            let word = chance.sentence({ words: 5 }) + '___' + i;
            words.push(word);
            await s3.zSetAdd(setName, i, word);
        }

        // Test number of items
        let items = await s3.zSetMembers(setName);
        expect(items.length).toEqual(words.length);

        // Test gte/lte
        let rangeItems = await s3.zRange(setName, {gte:3, lte:6, score: true});                
        expect(rangeItems.length).toEqual(4);
        expect(rangeItems[0].score).toEqual(3);
        expect(rangeItems[1].score).toEqual(4);
        expect(rangeItems[2].score).toEqual(5);
        expect(rangeItems[3].score).toEqual(6);

        // Test gt/lte
        rangeItems = await s3.zRange(setName, {gt:3, lte:6, score: true});        
        expect(rangeItems.length).toEqual(3);
        expect(rangeItems[0].score).toEqual(4);
        expect(rangeItems[1].score).toEqual(5);
        expect(rangeItems[2].score).toEqual(6);

        // Test gt/lt
        rangeItems = await s3.zRange(setName, {gt:3, lt:6, score: true});        
        expect(rangeItems.length).toEqual(2);
        expect(rangeItems[0].score).toEqual(4);
        expect(rangeItems[1].score).toEqual(5);

        // Test gte/lt
        rangeItems = await s3.zRange(setName, {gte:3, lt:6, score: true});     
        expect(rangeItems.length).toEqual(3);
        expect(rangeItems[0].score).toEqual(3);
        expect(rangeItems[1].score).toEqual(4);
        expect(rangeItems[2].score).toEqual(5);

        await s3.zSetClear(setName);



    });

})