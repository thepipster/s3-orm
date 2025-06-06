"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * this is an error that can be thrown and results in a failure message back
 * to the api (user error), but not treated internally as an error
 */
class QueryError extends Error {
    constructor(...args) {
        super(...args);
        this.code = 401;
        Error.captureStackTrace(this, QueryError);
    }
}
exports.default = QueryError;
//# sourceMappingURL=QueryError.js.map