
"use strict";

const AmazonHelper = require('./AmazonHelper')
const ImageUtils = require('./ImageUtils')
const Logger = require('./logger')
const tmp = require('tmp')
const Settings = require('../Settings.js')

var awsHelper = null
var testFile = null
var testKey = 'unit-tests/test-img.png'

describe('Model:Utils:AmazonHelper', () => {

    beforeAll(async (done) => {

        tmp.tmpName(async (err, tempFilename)=>{
            testFile = await ImageUtils.downloadRemoteFile('http://fillmurray.com/200/300', tempFilename)
            awsHelper = new AmazonHelper()
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
