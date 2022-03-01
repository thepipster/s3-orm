
"use strict";

const Session = require('./Session')
const ModelTester = require('./utils/ModelTester')

var tester = new ModelTester(Session, ['uid','token'])
tester.test()




/*

process.env.SESSION_TIME = 30000



const Settings = require('../../Settings.js')
const Session = require('./Session')
const Logger = require('../../utils/logger')
const ModelTester = require('./utils/ModelTester')

const tester = new ModelTester(Session)

describe('Model:Redis:Session', () => {
   
    beforeAll(async () => {

        // Timeout to wait for redis connection
        Settings.redisClient.once("connect", async (err) => {
            let sesh = new Session(tester.testInfo)
            await sesh.save()
        })
    })

    afterAll(async () => {
        await Session.remove(tester.testInfo.id)
    })


    test('save()', async () => {
        let sesh = new Session(tester.testInfo)
        let savedSesh = await sesh.save()
        tester.doCheck(savedSesh)
        return    
    });
    
    test('load(uid, token)', async () => {        
        let sesh = await Session.load(tester.testInfo.uid, tester.testInfo.token)
        tester.doCheck(sesh)
    })

})
*/