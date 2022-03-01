
"use strict";

require('dotenv-safe').config({});
const Logger = require('./utils/logger');
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
            let tmp = chance.word();
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

})
