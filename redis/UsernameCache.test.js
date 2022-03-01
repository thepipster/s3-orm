
"use strict";

const UsernameCache = require('./UsernameCache')
const Logger = require('../../utils/logger')
const Chance = require('chance');

let chance = new Chance()

let testUser = {
    uid: chance.guid(),
    displayName: chance.animal()
}

describe('Model:Redis:UsernameCache', () => {
    
    afterAll((done) => {
        UsernameCache.remove(testUser.displayName, (err, uid)=>{
            done()
        })
    })
        
    test('add()', (done) => {

        UsernameCache.add(testUser.displayName, testUser.uid, (err)=>{

            expect(err).toEqual(null)

            UsernameCache.get(testUser.displayName, (err, uid)=>{
                expect(err).toEqual(null)
                expect(uid).toEqual(testUser.uid)
                done()
            })
            
        })

    });

    test('case insensitivity', (done) => {

        UsernameCache.add(testUser.displayName, testUser.uid, (err)=>{

            expect(err).toEqual(null)

            Logger.debug(testUser.displayName.toUpperCase())
            UsernameCache.get(testUser.displayName.toUpperCase(), (err, uid)=>{
                expect(err).toEqual(null)
                expect(uid).toEqual(testUser.uid)
                done()
            })
            
        })

    });
/*
    test('remove()', (done) => {

        UsernameCache.add(testUser.displayName, testUser.uid, (err)=>{

            expect(err).toEqual(null)

            UsernameCache.remove(testUser.displayName, (err, uid)=>{

                expect(err).toEqual(null)

                UsernameCache.get(testUser.displayName, (err, uid)=>{
                    expect(err).toEqual(null)
                    expect(uid).toEqual(null)
                    done()
                })
            })
            
        })


    });
    */
})
