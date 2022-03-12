
"use strict";

const Storm = require('./Storm.js');
const Chance = require('chance')
var chance = new Chance()

var Model = Storm.define(chance.word(), {
    
});

describe('Storm', () => {

    beforeAll((done) => {
        
    })

    //afterAll(async () => {
    //})

    test('generateToken()', async () => {
        let n = chance.d100()
        let test = BaseModelHelper.generateToken(n)
        expect(test.length).toEqual(n)
        return
    })

    test('getKey(null)', async () => {
        let name = chance.word()
        let type = chance.word()
        let key = BaseModelHelper.getKey(name, type)
        expect(key).toEqual(`${BaseModelHelper.prefix}:{${name}:${type}}`)
        return
    })    
       
})
