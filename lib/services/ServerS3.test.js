
"use strict";

import ServerS3 from "./ServerS3";
import Logger from "../utils/Logger.js";
import tmp from 'tmp';
import _ from "lodash";

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
