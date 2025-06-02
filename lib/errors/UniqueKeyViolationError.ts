/**
 * This is an error that can be thrown and results in a failure message back 
 * to the api (user error), but not treated internally as an error
 */
class UniqueKeyViolationError extends Error {
    
    code: number = 200;
    
    constructor(...args: any[]) {
        super(...args);
        Error.captureStackTrace(this, UniqueKeyViolationError);
    }
}

export default UniqueKeyViolationError;