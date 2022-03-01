
"use strict";

const User = require('./User')
const ModelTester = require('./utils/ModelTester')
const Settings = require('../../Settings')
const Logger = require('../../utils/logger')

var tester = new ModelTester(User, 'uid')
tester.test()
/*
describe('Model:Redis:User.Extended', () => {

    beforeAll((done) => {

        // Timeout to wait for redis connection
        Settings.redisClient.once("connect", async (err) => {
            done()
        })
    })


    test('addCash()', async (done) => {
        
        let info = new User(User.generateMock())
        await info.save()

        await User.addCash(info.uid, 50)

        let test = await User.loadFromId(info.id)

        expect(test.cash).toEqual(info.cash+50)

        await test.remove()

        done()
    })
 
    test('addGems()', async (done) => {
        
        let info = new User(User.generateMock())
        await info.save()

        await User.addGems(info.uid, 50)

        let test = await User.loadFromId(info.id)

        expect(test.gems).toEqual(info.gems+50)

        await test.remove()
        
        Logger.debug('gems done')
        done()
    })

    test('checkUsernameExists()', async (done) => {
        
        let info = new User(User.generateMock())
        await info.save()

        let testMatch = await User.checkUsernameExists(info.displayName)
        let testLower = await User.checkUsernameExists(info.displayName.toLowerCase())
        let testUpper = await User.checkUsernameExists(info.displayName.toUpperCase())
        let testNonMatch = await User.checkUsernameExists(info.displayName+'ttttt')
        
        expect(testMatch).toEqual(true)
        expect(testUpper).toEqual(true)
        expect(testLower).toEqual(true)
        expect(testNonMatch).toEqual(false)

        await info.remove()
        
        done()
    })



})


*/