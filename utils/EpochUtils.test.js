
"use strict";

const EpochUtils = require('./EpochUtils')
const Logger = require('./logger')

let testEpoch = (new Date()).setUTCHours(0,0,0,0)

describe('Model:Utils:EpochUtils', () => {

    test('getTodayEpoch', () => {

        let epoch = EpochUtils.getTodayEpoch()
        
        expect(epoch).toEqual(testEpoch)

    });

    test('toDayEpoch using Date', () => {

        let testDate = new Date()    
        let epoch = EpochUtils.toDayEpoch(testDate)
        
        expect(epoch).toEqual(testEpoch)

    });

    test('toDayEpoch using String', () => {

        let testDate = new Date().toISOString()
        let epoch = EpochUtils.toDayEpoch(testDate)
        
        expect(epoch).toEqual(testEpoch)

    });    

    test('toDaysAgoEpoch', () => {

        let days = 5

        let now = new Date()
        now.setUTCHours(0,0,0,0)
        let dateObj = new Date(now)
        dateObj.setDate(dateObj.getDate() - days);
        let testEpoch = EpochUtils.toDayEpoch(dateObj)

        let epoch = EpochUtils.toDaysAgoEpoch(days)
        
        expect(epoch).toEqual(testEpoch)

    });  

    test('getArrayOfEpochDaysSinceEpoch', () => {

        let noDays = 5
        let epoch = EpochUtils.toDaysAgoEpoch(noDays)
        let days = EpochUtils.getArrayOfEpochDaysSinceEpoch(epoch)
        
        expect(days.length).toEqual(noDays+1)
        // Expact last element in array to be the day x days ago
        expect(days[days.length-1]).toEqual(epoch)

    });  

    
})
