
"use strict";

const Settings = require('../../../Settings')
const BaseModelHelper = require('./BaseModelHelper')
const Logger = require('../../../utils/logger')
const Chance = require('chance')
var chance = new Chance()

Logger.setLevel('debug')


describe('Model:Redis:BaseModelHelper', () => {

    beforeAll((done) => {

        // Timeout to wait for redis connection
        Settings.redisClient.once("connect", async (err) => {
            done()
        })
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
    
    test('getKey(id)', async () => {
        let name = chance.word()
        let type = chance.word()
        let id = chance.guid()
        let key = BaseModelHelper.getKey(name, type, id)
        expect(key).toEqual(`${BaseModelHelper.prefix}:{${name}:${type}:${id}}`)
        return
    })    

    test('isNumericType()', async () => {        
        expect(BaseModelHelper.isNumericType('integer')).toEqual(true)
        expect(BaseModelHelper.isNumericType('number')).toEqual(true)
        expect(BaseModelHelper.isNumericType('float')).toEqual(true)
        expect(BaseModelHelper.isNumericType('timestamp')).toEqual(true)
        expect(BaseModelHelper.isNumericType('date')).toEqual(true)
        expect(BaseModelHelper.isNumericType('string')).toEqual(false)
        expect(BaseModelHelper.isNumericType('array')).toEqual(false)
        expect(BaseModelHelper.isNumericType('json')).toEqual(false)
        expect(BaseModelHelper.isNumericType('object')).toEqual(false)
        expect(BaseModelHelper.isNumericType(chance.word())).toEqual(false)
        return
    })  

    test('parseBoolen()', async () => {        
        expect(BaseModelHelper.parseBoolen()).toEqual(false)
        expect(BaseModelHelper.parseBoolen(1)).toEqual(true)
        expect(BaseModelHelper.parseBoolen('1')).toEqual(true)
        expect(BaseModelHelper.parseBoolen(0)).toEqual(false)
        expect(BaseModelHelper.parseBoolen(-1)).toEqual(false)
        return
    })    

    test('parseItem()', async () => {        

        expect(BaseModelHelper.parseItem({type:'integer'}, '0')).toEqual(0)

        expect(BaseModelHelper.parseItem({type:'array'}, "[1, 2, 3, 4]")).toEqual([1,2,3,4])
        expect(BaseModelHelper.parseItem({type:'object'}, '{"a":35,"b":"tests"}')).toEqual({a:35,b:'tests'})

        // Tricky cases
        expect(BaseModelHelper.parseItem({type:'array'}, " ")).toEqual(null)
        expect(BaseModelHelper.parseItem({type:'integer'}, null)).toEqual(null)
        expect(BaseModelHelper.parseItem({type:'integer'}, undefined)).toEqual(null)

        return
    })  

    test('writeItem()', async () => {        

        expect(BaseModelHelper.writeItem({type:'integer'}, 0)).toEqual(0)

        expect(BaseModelHelper.writeItem({type:'array'}, [1, 2, 3, 4])).toEqual("[1,2,3,4]")
        expect(BaseModelHelper.writeItem({type:'object'}, {a:35,b:'tests'})).toEqual('{"a":35,"b":"tests"}')

        // Tricky cases
        //expect(BaseModelHelper.writeItem({type:'array'}, " ")).toEqual(null)
        expect(BaseModelHelper.writeItem({type:'integer'}, null)).toEqual('')
        expect(BaseModelHelper.writeItem({type:'integer'}, undefined)).toEqual('')

        return
    })        
})
