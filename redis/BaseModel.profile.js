
"use strict";

const Settings = require('../../Settings')
const BaseModel = require('./BaseModel')
const BaseModelHelper = require('./BaseModelHelper')
const Logger = require('../../utils/logger')
const NUMBER_TESTS = 1000
const Promise = require('bluebird')

Logger.setLevel('debug')

class TestModel extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'TestBaseModel'
    }

    static _model(){
        return {
            aString: {type: 'string', index: true, unique: true},            
            aDate: {type: 'date', index: true},            
            aDate2: {type: 'timestamp', index: true},            
            aNumber: {type: 'number', index: true},            
            aInteger: {type: 'integer', index: true},            
            aFloat: {type: 'float', index: true},            
            aBoolean: {type: 'boolean', index: true},            
            aArray: {type: 'array', index: true},            
            aJSONObject: {type: 'json'},            
            aObject: {type: 'object'}
        }
    }    
 
}

var tests = []
var prof = new Profiler()

// Profile the non-static remove
tests.push(async function profileRemove(){

    for (let i=0; i<NUMBER_TESTS; i+=1){

        var testInfo = TestModel.generateMock()
        let test1 = new TestModel(testInfo)
        await test1.save()
        prof.start('remove')
        await test1.remove()
        prof.stop('remove')        
    }

    return

})

// Profile the static _cleanIndices
tests.push(async function profileRemove(){

    for (let i=0; i<NUMBER_TESTS; i+=1){

        prof.start('_cleanIndices')
        await TestModel._cleanIndices()
        prof.stop('_cleanIndices')        
    }

    return

})

Settings.redisClient.once("connect", async (err) => {

    Promise
        .mapSeries(tests, function(test){
            return test()
        })
        .then(function() {
            prof.showResults()
            Logger.info('Tests complete')
            process.exit(1)
        })
        .catch(function(err){
            Logger.error(err)
            process.exit(1)
        })
})