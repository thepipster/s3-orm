
"use strict";

const Settings = require('../../Settings');
const Cipher = require('./Cipher');
const Logger = require('../utils/Logger');
const Chance = require('chance');
const sleep = require('util').promisify(setTimeout);

describe('Common:Utils:Cipher', () => {

    beforeAll(async () => {        
        // Wait for database connection
        await sleep(500);
        return;
    });

    test('should encrypt', (done) => {

        const chance = new Chance();
        let test = chance.paragraph();

        let encoded = Cipher.encode(test);
        
        expect(encoded).not.toEqual(test);

        return done();

    });

    test('should decrypt', (done) => {

        const chance = new Chance();
        let test = chance.paragraph();

        let encoded = Cipher.encode(test);
        let decoded = Cipher.decode(encoded);
    
        //Logger.warn('encoded = ', encoded);
        //Logger.warn('decoded = ', decoded);
    
        expect(encoded).not.toEqual(test);
        expect(decoded).toEqual(test);        

        return done();

    });    


    test('should decrypt an object', (done) => {

        const chance = new Chance();

        let test = {
            txt: chance.paragraph(),
            no: chance.d10()
        }

        let encoded = Cipher.encodeObject(test);
        let decoded = Cipher.decodeObject(encoded);
    
        Logger.warn('encoded = ', encoded);
        Logger.warn('decoded = ', decoded);
    
        expect(encoded).not.toEqual(test);
        expect(decoded).toEqual(test);        

        return done();

    });  

    test('should create a checksum', (done) => {

        let test = 'My dog is a crazy dog';

        let cs = Cipher.checksum(test);
    
        expect(cs).toEqual('08f32a9b249e3ecf2f3f3f84a6910604cd6493e9d8be7f45b6d3c7cfe7503db0');        

        return done();

    });        

    
})

