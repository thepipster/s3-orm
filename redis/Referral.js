"use strict";

const BaseModel = require('./BaseModel')

class Referral extends BaseModel {
    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'Referrals'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true, defaultValue: this.getUUID()},
            fromUserUid: {type:'string', index: true},
            toUserUid: {type:'string', index: true},
            displayName: {type:'string'},
            fromDisplayName: {type:'string'},
            date: {type:'date', index: true},
            needsReview: { type: 'boolean', defaultValue: false, index:true},
            reviewNote: { type: 'string'},
            isViewed: {type:'boolean', defaultValue: false, index:true},
            isAwarded: {type:'boolean', defaultValue: false, index:true},
            gems: {type:'integer'}
        }
    }    
    
}

Referral.register()

module.exports = Referral