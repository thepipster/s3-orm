/**
 * this is an error that can be thrown and results in a failure message back 
 * to the api (user error), but not treated internally as an error
 */
class AuthError extends Error {
    
    code: number = 403;

    constructor(...args) {
        super(...args)
        Error.captureStackTrace(this, AuthError)
    }
}

export default AuthError;