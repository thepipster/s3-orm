/**
 * this is an error that can be thrown and results in a failure message back 
 * to the api (user error), but not treated internally as an error
 */
class AuthError extends Error {
    
    constructor(...args) {
        super(...args)
        this.code = 401
        Error.captureStackTrace(this, AuthError)
    }
}

module.exports = AuthError