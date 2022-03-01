
"use strict";

const UniqueKeyViolationError = require('./UniqueKeyViolationError')

describe('Lib:UniqueKeyViolationError', () => {

    test('UniqueKeyViolationError()', (done) => {

        let msg = 'This is a custom user error'
        
        try {
            throw new UniqueKeyViolationError(msg)
        }
        catch(err){
            expect(err.toString()).toEqual('Error: ' + msg)
            done()
        }

    });

    test('UniqueKeyViolationError().code', (done) => {

        let msg = 'This is a custom user error'
        
        try {
            throw new UniqueKeyViolationError(msg)
        }
        catch(err){
            expect(err.code).toEqual(200)
            done()
        }

    });

})
