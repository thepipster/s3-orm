"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * this is an error that can be thrown and results in a failure message back
 * to the api (user error), but not treated internally as an error
 */
class AuthError extends Error {
    constructor(...args) {
        super(...args);
        this.code = 403;
        Error.captureStackTrace(this, AuthError);
    }
}
exports.default = AuthError;
//# sourceMappingURL=AuthError.js.map