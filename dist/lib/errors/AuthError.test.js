"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AuthError_1 = __importDefault(require("../../lib/errors/AuthError"));
describe('Lib:AuthError', () => {
    test('AuthError()', (done) => {
        let msg = 'This is a custom user error';
        try {
            throw new AuthError_1.default(msg);
        }
        catch (err) {
            expect(err.toString()).toEqual('Error: ' + msg);
            done();
        }
    });
    test('AuthError().code', (done) => {
        let msg = 'This is a custom user error';
        try {
            throw new AuthError_1.default(msg);
        }
        catch (err) {
            expect(err.code).toEqual(403);
            done();
        }
    });
});
//# sourceMappingURL=AuthError.test.js.map