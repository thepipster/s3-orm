"use strict";

const Logger = require('./logger.js')

/**
 * Utils for dealing with epoch times (Epoch time is defined 
 * as  number of seconds that have elapsed since January 1, 1970 (midnight UTC/GMT), 
 * not counting leap seconds (in ISO 8601: 1970-01-01T00:00:00Z).)
 */
var EpochUtils = {

    /**
     * Get the epoch of today, i.e. the epoch time in seconds at the START of the day.
     * Epoch time is defined as  number of seconds that have elapsed since January 1, 1970 (midnight UTC/GMT), 
     * not counting leap seconds (in ISO 8601: 1970-01-01T00:00:00Z).
     */
    getTodayEpoch(){
        return (new Date()).setUTCHours(0,0,0,0)
    },

    /**
     * Take a date and return the epoch time (seconds) at the START of the day. Epoch time is defined 
     * as  number of seconds that have elapsed since January 1, 1970 (midnight UTC/GMT), 
     * not counting leap seconds (in ISO 8601: 1970-01-01T00:00:00Z).
     * @param {Date} dateObj The date to convert
     */
    toDayEpoch(dateObj){
        if (typeof dateObj == 'string'){
            dateObj = new Date(dateObj)
        }
        return dateObj.setUTCHours(0,0,0,0)
    },

    /**
     * Get the day start epoch time x daysAgo
     * @param {integer} daysAgo 
     */
    toDaysAgoEpoch(daysAgo){
        let now = new Date()
        now.setUTCHours(0,0,0,0)
        let dateObj = new Date(now)
        dateObj.setDate(dateObj.getDate() - daysAgo);
        return EpochUtils.toDayEpoch(dateObj)
    },

    getMilliSecondsSince(endDate){
        let startDate = new Date()
        return startDate - endDate
    },

    getSecondsSince(endDate){
        let startDate = new Date()
        return EpochUtils.getSecondsBetweenDates(startDate, endDate)
    },

    getSecondsBetweenDates(startDate, endDate){
        return Math.floor(( startDate - endDate ) / 1000    )     
    },

    /**
     * Get the number of days since fromDate and return an array of epoch times for each day. 
     * That is, for each day return the epoch time for the start of that day
     * @param {Date} fromDate The date that is in the past
     */
    getArrayOfEpochDaysSince(fromDate){

        if (typeof dateObj == 'string'){
            dateObj = new Date(dateObj)
        }

        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
        var toDate = new Date()

        var diffDays = Math.ceil(Math.abs((fromDate.getTime() - toDate.getTime())/(oneDay)))
    
        let epochDays = []
        for (let i=0; i<=diffDays; i+=1){
            let epochDay = EpochUtils.toDaysAgoEpoch(i)
            epochDays.push(epochDay)
        }

        return epochDays
    },

    getArrayOfEpochDaysSinceEpoch(fromEpoch){

        if (typeof dateObj == 'string'){
            dateObj = new Date(dateObj)
        }

        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds

        var diffDays = Math.ceil(Math.abs(fromEpoch - Date.now())/oneDay) 
    
        let epochDays = []
        for (let i=0; i<diffDays; i+=1){
            let epochDay = EpochUtils.toDaysAgoEpoch(i)
            epochDays.push(epochDay)
        }

        return epochDays
    }

}


if(require.main === module) {
    Logger.debug(EpochUtils.toDayEpoch(new Date('2018-10-19 23:58:24.175+00')))
}
else {
    export default  EpochUtils;
}
