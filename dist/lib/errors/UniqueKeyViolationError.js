"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This is an error that can be thrown and results in a failure message back
 * to the api (user error), but not treated internally as an error
 */
class UniqueKeyViolationError extends Error {
    constructor(...args) {
        super(...args);
        this.code = 200;
        Error.captureStackTrace(this, UniqueKeyViolationError);
    }
}
exports.default = UniqueKeyViolationError;
//# sourceMappingURL=UniqueKeyViolationError.js.map