
"use strict";

const ServerS3 = require('./ServerS3')
const ImageUtils = require('./ImageUtils')
const Logger = require('./logger')
const tmp = require('tmp')
const Settings = require('../Settings.js')

var awsHelper = null
var testFile = null
var testKey = 'unit-tests/test-img.png'

describe('Model:Utils:ServerS3', () => {

    beforeAll(async (done) => {

        tmp.tmpName(async (err, tempFilename)=>{
            testFile = await ImageUtils.downloadRemoteFile('http://fillmurray.com/200/300', tempFilename)
            awsHelper = new ServerS3()
            done()
        })

    })

    afterAll(async (done) => {
        done()
    })

    test('upload', async (done) => {
        await awsHelper.upload(testFile, testKey)
        done()
    })


})
