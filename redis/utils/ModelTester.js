
"use strict";

const Settings = require('../../../Settings.js')
const Logger = require('../../../utils/logger.js')
const _ = require('lodash')

class ModelTester {

    /**
     * Setup the test helper
     * @param {Class} Model The model class to test
     * @param {string|array} primaryKey The primary key, or keys (either a string or an array of strings)
     */
    constructor(Model, primaryKey){
        if (!primaryKey){
            primaryKey = 'uuid'
        }
        this.primaryKey = primaryKey
        this.Model = Model
        this.testInfo = Model.generateMock()
    }

    /**
     * Run the tests!
     */
    test(){

        let Model = this.Model
        let testInfo = this.testInfo

        describe(`Model:Redis:${Model._name()}`, () => {
        
            beforeAll(async (done) => {

                // Timeout to wait for redis connection
                Settings.redisClient.once("connect", async (err) => {
                    let doc = new Model(testInfo)
                    await doc.save()
                    done()
                })
            })

            afterAll(async (done) => {
                await Model.remove(testInfo.id)
                done()
            })

            test('new()', async (done) => {
                let doc = new Model(testInfo)
                this.doCheck(doc, 'new')
                done()    
            });

            test('save()', async (done) => {
                let doc = new Model(testInfo)
                let savedDoc = await doc.save()
                this.doCheck(savedDoc)
                done()    
            });
            
            test('loadFromId()', async (done) => {
                let doc = await Model.loadFromId(testInfo.id)
                this.doCheck(doc)
                done()    
            });

            test('findOne(primaryKey)', async (done) => {
                
                if (!this.primaryKey){
                    Logger.warn(`Primary key not set for the ${Model._name()} test suite so cant test findOne()`)
                    done()
                    return
                }

                let query = {}
                if (typeof this.primaryKey == 'object'){
                    for (let i=0; i<this.primaryKey.length; i+=1){
                        let key = this.primaryKey[i]
                        query[key] = testInfo[key]
                    }
                }
                else {
                    query[this.primaryKey] = testInfo[this.primaryKey]
                }

                let doc = await Model.findOne(query)
                this.doCheck(doc)
                done()    
            });

        })

    }

    doCheck(info, type){
        
        for (let key in this.testInfo){

            if (!_.isEqual(info[key], this.testInfo[key]) && key != 'modified' && key != 'created'){
                Logger.error(`${key} does not match: ${info[key]} should be ${this.testInfo[key]}`)
                Logger.error('testInfo = ', this.testInfo)
                Logger.error('info = ', info)
            }

            //if (info[key] != this.testInfo[key] && key != 'modified' && key != 'created'){
            //    Logger.error(`[doCheck] Test Fail: '${key}' does not match`, info)
            //}

            if (key != 'modified' && key != 'created'){
                expect(info[key]).toEqual(this.testInfo[key])
                expect(typeof info[key]).toEqual(typeof this.testInfo[key])
            }
        }

        // there should also be a modified and created field
        if (type != 'new'){
            expect(info.created instanceof Date).toEqual(true)
            expect(info.modified instanceof Date).toEqual(true)
        }

    }

}

module.exports = ModelTester