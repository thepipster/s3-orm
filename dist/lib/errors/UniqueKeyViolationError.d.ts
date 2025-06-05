/**
 * This is an error that can be thrown and results in a failure message back
 * to the api (user error), but not treated internally as an error
 */
declare class UniqueKeyViolationError extends Error {
    code: number;
    constructor(...args: any[]);
}
export default UniqueKeyViolationError;
//# sourceMappingURL=UniqueKeyViolationError.d.ts.map