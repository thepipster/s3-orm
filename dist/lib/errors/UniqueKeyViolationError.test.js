"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UniqueKeyViolationError_1 = __importDefault(require("../../lib/errors/UniqueKeyViolationError"));
describe('Lib:UniqueKeyViolationError', () => {
    test('UniqueKeyViolationError()', (done) => {
        let msg = 'This is a custom user error';
        try {
            throw new UniqueKeyViolationError_1.default(msg);
        }
        catch (err) {
            expect(err.toString()).toEqual('Error: ' + msg);
            done();
        }
    });
    test('UniqueKeyViolationError().code', (done) => {
        let msg = 'This is a custom user error';
        try {
            throw new UniqueKeyViolationError_1.default(msg);
        }
        catch (err) {
            expect(err.code).toEqual(200);
            done();
        }
    });
});
//# sourceMappingURL=UniqueKeyViolationError.test.js.map