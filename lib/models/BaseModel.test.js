
"use strict";

require('dotenv-safe').config({});
const Logger = require('../utils/logger')
const Storm = require('../Storm.js');
const Engine = require('../engines/Engine.js');
const DataTypes = require('../types');
const _ = require('lodash');
const Chance = require('chance');
const chance = new Chance();

// uuid: { type: DataTypes.String, default: uuidv4}, 

// Pass in the engine, this allows swapping out the back-end DB 
//const s3 = new ClientEngine();
const s3 = new Engine({acl:'public-read'});
const storm = new Storm(s3);

const TestModel = storm.define('test-model', {
    aString: {type: DataTypes.String, index: true, unique: true},            
    aDate: {type: DataTypes.Date, index: true},            
    aDate2: {type: DataTypes.Date, index: true},            
    aNumber: {type: DataTypes.Number, index: true},            
    aInteger: {type: DataTypes.Integer, index: true},            
    aFloat: {type: DataTypes.Float, index: true},            
    aBoolean: {type: DataTypes.Boolean, index: true},            
    aArray: {type: DataTypes.Array, index: true},            
    aJSONObject: {type: DataTypes.Json},            
    aObject: {type: DataTypes.Json}        
}, {expires: 100});



var testInfo = TestModel.generateMock()
var testInfo2 = TestModel.generateMock()
var testInfo3 = TestModel.generateMock()

testInfo.id = '1abc'
testInfo2.id = '2def'
testInfo3.id = '3ghi'

testInfo.aFloat = 5.5
testInfo2.aFloat = 15.6
testInfo3.aFloat = 21.2

function doCheck(info, testDoc){

    if (!testDoc){
        testDoc = testInfo
    }

    //expect(info['id']).toEqual(testDoc['id'])

    expect(info['aString']).toEqual(testDoc['aString'])
    expect(info['aString']).toBeInstanceOf(DataTypes.String)
/*
    expect(info['aDate']).toEqual(testDoc['aDate'])
    expect(typeof info['aDate']).toEqual(typeof testDoc['aDate'])

    expect(info['aDate2']).toEqual(testDoc['aDate2'])
    expect(typeof info['aDate2']).toEqual(typeof testDoc['aDate2'])

    expect(info['aNumber']).toEqual(testDoc['aNumber'])
    expect(typeof info['aNumber']).toEqual(typeof testDoc['aNumber'])

    expect(info['aInteger']).toEqual(testDoc['aInteger'])
    expect(typeof info['aInteger']).toEqual(typeof testDoc['aInteger'])

    expect(info['aFloat']).toEqual(testDoc['aFloat'])
    expect(typeof info['aFloat']).toEqual(typeof testDoc['aFloat'])

    expect(info['aBoolean']).toEqual(testDoc['aBoolean'])
    expect(typeof info['aBoolean']).toEqual(typeof testDoc['aBoolean'])

    expect(info['aArray']).toEqual(testDoc['aArray'])
    expect(typeof info['aArray']).toEqual(typeof testDoc['aArray'])

    expect(info['aObject']).toEqual(testDoc['aObject'])
    expect(typeof info['aObject']).toEqual(typeof testDoc['aObject'])

    expect(info['aJSONObject']).toEqual(testDoc['aJSONObject'])
    expect(typeof info['aJSONObject']).toEqual(typeof testDoc['aJSONObject'])
*/
    /*
    for (let key in testInfo){


        Logger.debug(`for key ${key}, info = ${info[key]} testInfo = ${testInfo[key]}`)
        expect(info[key]).toEqual(testInfo[key])
        expect(typeof info[key]).toEqual(typeof testInfo[key])
    }
    */
}

describe('BasdeModel', () => {

    beforeAll(async () => {

        // Timeout to wait for redis connection
        let test1 = new TestModel(testInfo)
        let test2 = new TestModel(testInfo2)
        let test3 = new TestModel(testInfo3)
        await test1.save()
        await test2.save()
        await test3.save()
        return
    })

    afterAll(async () => {
        let ids = await TestModel.getIds()
        for (let i=0; i<ids.length; i+=1){
            //Logger.debug('Deleting ' + ids[i])
            await TestModel.remove(ids[i])
        }
        return
    })

    test('new()', async () => {
        let test = new TestModel(testInfo)
        doCheck(test)
        return
    })

    test('save()', async () => {
        let data = TestModel.generateMock()
        let test = new TestModel(data)        
        await test.save()
        let test2 = await TestModel.loadFromId(data.id)
        doCheck(test2, data)
        return
    })

    test('unique', async () => {

        let test1 = new TestModel(TestModel.generateMock())
        var emittedError = false
        await test1.save()

        try {
            let test2 = new TestModel(TestModel.generateMock())
            test2.aString = test1.aString
            await test2.save()
        }
        catch (err){
            expect(err.toString().search('is unique, and already exists')).not.toEqual(-1)
            emittedError = true
        }

        expect(emittedError).toEqual(true)
        return
    })


    test('loadFromId()', async () => {
        let loaded = await TestModel.loadFromId(testInfo.id)
        doCheck(loaded)
        return
    })

    test('loadFromId(null)', async () => {
        let loaded = await TestModel.loadFromId(null)
        expect(loaded).toEqual(null)
        return
    })

    test('exists()', async () => {

        let isExist = await TestModel.exists(testInfo.id)
        expect(isExist).toEqual(true)

        let isNotExist = await TestModel.exists('dsgsdgs')
        expect(isNotExist).toEqual(false)

        return
    })

    test.only('findOne(string)', async () => {
        let doc = await TestModel.findOne({aString:testInfo.aString})
        doCheck(doc)
        return
    })

    // Should return all the id's
    test('getIds({})', async () => {
        let docs = await TestModel.getIds({})
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.id)).not.toEqual(-1)
        expect(docs.indexOf(testInfo3.id)).not.toEqual(-1)
        return
    })

    test('getIds({integer})', async () => {
        let docs = await TestModel.getIds({aInteger:testInfo.aInteger})
        expect(docs.length).toEqual(1)
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.id)).toEqual(-1)
        expect(docs.indexOf(testInfo3.id)).toEqual(-1)
        return
    })

    test('getIds({string})', async () => {
        let docs = await TestModel.getIds({aString:testInfo.aString})
        expect(docs.length).toEqual(1)
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.id)).toEqual(-1)
        expect(docs.indexOf(testInfo3.id)).toEqual(-1)
        return
    })

    test('find(<does not exist>)', async () => {
        let docs = await TestModel.find({aString:'xxxxxx'})
        expect(docs.length).toEqual(0)
        return
    })

    test('find(string)', async () => {
        let docs = await TestModel.find({aString:testInfo.aString})
        expect(docs.length).toEqual(1)
        doCheck(docs[0])
        return
    })

    test('find(integer)', async () => {
        let docs = await TestModel.find({aInteger:testInfo.aInteger})
        expect(docs.length).toEqual(1)
        doCheck(docs[0])
        return
    })

    test('find(float)', async () => {
        let docs = await TestModel.find({aFloat:testInfo.aFloat})
        expect(docs.length).toEqual(1)
        doCheck(docs[0])
        return
    })

    test('find({range})', async () => {
        // testInfo.aFloat = 5.5
        // testInfo2.aFloat = 15.6
        // testInfo3.aFloat = 21.2
        let query = {
            aFloat: {
                $gte: 15.0,
                $lte: 22.0
            }
        }
        let docs = await TestModel.find(query)
        expect(docs.length).toEqual(2)
        doCheck(docs[0], testInfo2)
        return
    })


    test('find({range, limit})', async () => {
        // testInfo.aFloat = 5.5
        // testInfo2.aFloat = 15.6
        // testInfo3.aFloat = 21.2
        let query = {
            aFloat: {
                $gt: 15.0,
                $lte: 22.0,
                limit: 1,
                offset: 1
            }
        }
        let docs = await TestModel.find(query)
        expect(docs.length).toEqual(1)
        doCheck(docs[0], testInfo3)
        return
    })

    test('distinct(aString, null)', async () => {
        
        let docs = await TestModel.distinct('aString')
        
        let allDocs = await TestModel.find({})

        //Logger.warn('strings = ', _.map(allDocs, 'aString'))
        let allStrings = _.uniq(_.map(allDocs, 'aString'))
        //Logger.warn('unique strings = ', allStrings)

        expect(docs.length).toEqual(allStrings.length)

        expect(docs.indexOf(testInfo.aString)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.aString)).not.toEqual(-1)
        expect(docs.indexOf(testInfo3.aString)).not.toEqual(-1)
        return
    })

    test('distinct(aString, {aString})', async () => {
        let docs = await TestModel.distinct('aString', {aString:testInfo.aString})
        expect(docs.length).toEqual(1)
        expect(docs.indexOf(testInfo.aString)).not.toEqual(-1)
        return
    })


    test('count({})', async () => {
        let no = await TestModel.count({})
        let allIds = await TestModel.getIds()
        expect(no).toEqual(allIds.length)
        return
    })

    test('count({aString})', async () => {
        let no = await TestModel.count({aString:testInfo.aString})
        expect(no).toEqual(1)
        return
    })

    test('static remove(id)', async () => {

        var testInfo = TestModel.generateMock()
        let test = new TestModel(testInfo)
        let doc = await test.save()

        await TestModel.remove(doc.id)

        let modelName = TestModel._name()
        let model = TestModel._model()

        // Check all the data is gone
        let testHash = await BaseModel._redisCommand('exists', BaseModelHelper.getKey(modelName, 'hash', doc.id))
        expect(testHash).toEqual(0)

        let testIdSet = await BaseModel._redisCommand('sismember', BaseModelHelper.getKey(modelName, 'idsets'), doc.id)
        expect(testIdSet).toEqual(0)

        let testExpiresSet = await BaseModel._redisCommand('sismember', BaseModelHelper.getKey(modelName, 'expire'), doc.id)
        expect(testExpiresSet).toEqual(0)

        for (let field in model){

            let val = doc[field]

            if (model[field].index){
                let key = `${BaseModelHelper.getKey(modelName, 'index')}:${field}:${val}`
                let temp = await BaseModel._redisCommand('sismember', key, doc.id)
                expect(temp).toEqual(0)
            }

            if (model[field].unique){
                let key = `${BaseModelHelper.getKey(modelName, 'unique')}:${field}:${val}`
                let temp = await BaseModel._redisCommand('sismember', key, doc.id)
                expect(temp).toEqual(0)
            }

            if (BaseModelHelper.isNumericType(model[field].type)){
                let key = `${BaseModelHelper.getKey(modelName, 'scoredindex')}:${field}`
                let temp = await BaseModel._redisCommand('zscore', key, doc.id)
                expect(temp).toEqual(null)
            }
        }

        return
    })

    test('remove()', async () => {

        var testInfo = TestModel.generateMock()
        let test = new TestModel(testInfo)
        let doc = await test.save()

        await doc.remove()

        let modelName = TestModel._name()
        let model = TestModel._model()

        // Check all the data is gone
        let testHash = await BaseModel._redisCommand('exists', BaseModelHelper.getKey(modelName, 'hash', doc.id))
        expect(testHash).toEqual(0)

        let testIdSet = await BaseModel._redisCommand('sismember', BaseModelHelper.getKey(modelName, 'idsets'), doc.id)
        expect(testIdSet).toEqual(0)

        let testExpiresSet = await BaseModel._redisCommand('sismember', BaseModelHelper.getKey(modelName, 'expire'), doc.id)
        expect(testExpiresSet).toEqual(0)

        for (let field in model){

            let val = doc[field]

            if (model[field].index){
                let key = `${BaseModelHelper.getKey(modelName, 'index')}:${field}:${val}`
                let temp = await BaseModel._redisCommand('sismember', key, doc.id)
                expect(temp).toEqual(0)
            }

            if (model[field].unique){
                let key = `${BaseModelHelper.getKey(modelName, 'unique')}:${field}:${val}`
                let temp = await BaseModel._redisCommand('sismember', key, doc.id)
                expect(temp).toEqual(0)
            }

            if (BaseModelHelper.isNumericType(model[field].type)){
                let key = `${BaseModelHelper.getKey(modelName, 'scoredindex')}:${field}`
                let temp = await BaseModel._redisCommand('zscore', key, doc.id)
                expect(temp).toEqual(null)
            }
        }

        return
    })    

    test('save(expires)', async () => {

        const expiresSeconds = 2
        var testInfo = TestModel.generateMock()
        let test = new TestModel(testInfo)
        let ghost = await test.save({expires:expiresSeconds})

        let isExist = await TestModel.exists(ghost.id)
        expect(isExist).toEqual(true)

        await BaseModelHelper.sleep(expiresSeconds*1000)

        // Force to update expire indices
        await ghost._clearExpireIndices()

        let isExist2 = await TestModel.exists(ghost.id)
        expect(isExist2).toEqual(false)

        return
    })

    test('setFieldById()', async () => {

        let key1 = `${BaseModelHelper.getKey(TestModel._name(), 'index')}:aBoolean:1`
        let key2 = `${BaseModelHelper.getKey(TestModel._name(), 'index')}:aBoolean:0`
        var testInfo = TestModel.generateMock()
        testInfo.aBoolean = false

        Logger.debug(`[KEYS] ${key1} | ${key2}`)       

        let test = new TestModel(testInfo)
        await test.save()

        // Check indices before
        let testIdSetTrue = await BaseModel._redisCommand('sismember', key1, testInfo.id)
        let testIdSetFalse = await BaseModel._redisCommand('sismember', key2, testInfo.id)
        Logger.debug(`[BEFORE] True:${testIdSetTrue} | False:${testIdSetFalse} -- ${test.aBoolean}`)       
        expect(testIdSetTrue).toEqual(0)
        expect(testIdSetFalse).toEqual(1)

        // Set the value        
        await TestModel.setFieldById(testInfo.id, 'aBoolean', true)
        //test.aBoolean = true
        //await test.save()

        Logger.warn(test.aBoolean)

        // Check indices after
        testIdSetTrue = await BaseModel._redisCommand('sismember', key1, testInfo.id)
        testIdSetFalse = await BaseModel._redisCommand('sismember', key2, testInfo.id)
        Logger.debug(`[AFTER] True:${testIdSetTrue} | False:${testIdSetFalse} -- ${test.aBoolean}`)
        expect(testIdSetTrue).toEqual(1)
        expect(testIdSetFalse).toEqual(0)


        // Reload, but use a find to make sure the index is updated
        let docs = await TestModel.find({aNumber:testInfo.aNumber, aInteger:testInfo.aInteger, aBoolean:true})
        //Logger.debug('docs[0] = ', docs[0])

        expect(docs.length).toEqual(1)
        expect(docs[0].aBoolean).toEqual(true)

        // Check the rest of the data is good
        testInfo.aBoolean = true
        doCheck(docs[0], testInfo)
 

        await docs[0].remove()

        return
    })

    /*
    test('versioning', async () => {

        let state = new TestModel(testInfo)
        let temp = await state.save()
        let testId = temp.id

        let testState1 = await TestModel.loadFromId(testId)        
        testState1.aString = 'blarg-state1' // <-- we don't want to keep this

        // Now make changes to the 2nd one, and save
        let testState2 = await TestModel.loadFromId(testId)
        testState2.aNumber = testInfo.aNumber + 164 // <!-- should keep this
        testState2.aString = 'blarg-state2' // <!-- problem, this is over written by changes to testState1
        await testState2.save()

        // Now save state 1, which would over-write changes to testState2
        await testState1.save()

        let confirmState = await TestModel.loadFromId(testId)

        // Expect to keep the `aString` from testState1 and the `aNumber` from testState2
        // i.e. merge the changes
        expect(confirmState.aString).toEqual(testState1.aString)
        expect(confirmState.aNumber).toEqual(testState2.aNumber)
        
        return        

    });
    */

})
