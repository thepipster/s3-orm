
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger');
const chance = require('chance')();
const _ = require('lodash');
const Engine = require('./Engine.js');
const ClientEngine = require('./ClientEngine.js');
const s3 = new Engine({acl:'public-read'});
const s3Client = new ClientEngine();
const Promise = require('bluebird');

describe('ClientEngine', () => {

    test('setIntersection()', async () => {
        
        const setNames = ['client-test-set-1', 'client-test-set-2', 'client-test-set-3'];
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

        let inter = await s3Client.setIntersection(setNames);
        
        expect(inter.length).toEqual(commonWords.length);

        // Clean up
        await Promise.map(setNames, async (setName) => {
            await s3.setClear(setName);
        });        
        
        return;
    })


    test('ordered set query', async () => {

        const setName = 'client-zset-test';
        await s3.zSetClear(setName);

        const no = 8;
        let words = [];
        for (let i=0; i<no; i+=1){
            let word = chance.sentence({ words: 5 }) + '___' + i;
            words.push(word);
            await s3.zSetAdd(setName, i, word);
        }

        // Test number of items
        let items = await s3Client.zSetMembers(setName);
        expect(items.length).toEqual(words.length);

        // Test gte/lte
        let rangeItems = await s3Client.zRange(setName, {gte:3, lte:6, score: true});                
        expect(rangeItems.length).toEqual(4);
        expect(rangeItems[0].score).toEqual(3);
        expect(rangeItems[1].score).toEqual(4);
        expect(rangeItems[2].score).toEqual(5);
        expect(rangeItems[3].score).toEqual(6);

        // Test gt/lte
        rangeItems = await s3Client.zRange(setName, {gt:3, lte:6, score: true});        
        expect(rangeItems.length).toEqual(3);
        expect(rangeItems[0].score).toEqual(4);
        expect(rangeItems[1].score).toEqual(5);
        expect(rangeItems[2].score).toEqual(6);

        // Test gt/lt
        rangeItems = await s3Client.zRange(setName, {gt:3, lt:6, score: true});        
        expect(rangeItems.length).toEqual(2);
        expect(rangeItems[0].score).toEqual(4);
        expect(rangeItems[1].score).toEqual(5);

        // Test gte/lt
        rangeItems = await s3Client.zRange(setName, {gte:3, lt:6, score: true});     
        expect(rangeItems.length).toEqual(3);
        expect(rangeItems[0].score).toEqual(3);
        expect(rangeItems[1].score).toEqual(4);
        expect(rangeItems[2].score).toEqual(5);

        await s3.zSetClear(setName);



    });

})
