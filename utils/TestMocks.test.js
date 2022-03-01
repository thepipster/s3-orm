const Mocks = require('./TestMocks')
const _ = require('lodash')

describe('TestMocks', () => {    

    it('Mocks.generateToken', (done) => { 

        Mocks.user.token = null
        
        Mocks.generateToken((err) => {
            expect(_.isNull(err)).toBe(false)
            expect(typeof Mocks.user.token).toEqual('string')    
            done()        
        })
    })
})