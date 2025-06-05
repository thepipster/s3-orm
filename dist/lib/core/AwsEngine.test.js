"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AwsEngine_1 = require("../../lib/core/AwsEngine");
const S3Helper_1 = require("../../lib/services/S3Helper");
const EngineHelpers_1 = require("../../lib/core/EngineHelpers");
jest.mock('../../lib/services/S3Helper');
describe('AwsEngine', () => {
    let engine;
    let s3Helper;
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Create a mocked instance of S3Helper
        s3Helper = new S3Helper_1.S3Helper({});
        const s3Options = {
            bucket: 'test-bucket',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            prefix: 'test/'
        };
        engine = new AwsEngine_1.AwsEngine(s3Options);
        // Replace the real S3Helper with our mock
        engine.aws = s3Helper;
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    describe('Object Operations', () => {
        it('should set an object', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            const obj = { test: 'data' };
            yield engine.setObject(key, obj);
            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(JSON.stringify(obj), expect.stringContaining('test/hash/testKey'));
        }));
        it('should get an object', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            const obj = { test: 'data' };
            s3Helper.get.mockResolvedValue(JSON.stringify(obj));
            const result = yield engine.getObject(key);
            expect(s3Helper.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(obj);
        }));
        it('should check if object exists', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            s3Helper.exists.mockResolvedValue(true);
            const result = yield engine.hasObject(key);
            expect(s3Helper.exists).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        }));
        it('should delete an object', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            yield engine.delObject(key);
            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining('test/hash/testKey'));
        }));
    });
    describe('Set Operations', () => {
        it('should add to a set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const value = 'testValue';
            const meta = 'testMeta';
            const encodedValue = EngineHelpers_1.EngineHelpers.encode(value);
            yield engine.setAdd(setName, value, meta);
            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(meta, expect.stringContaining(`test/sets/${setName}/${encodedValue}`));
        }));
        it('should check set membership', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const value = 'testValue';
            s3Helper.exists.mockResolvedValue(true);
            const result = yield engine.setIsMember(setName, value);
            expect(s3Helper.exists).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        }));
        it('should remove from a set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const value = 'testValue';
            const encodedValue = EngineHelpers_1.EngineHelpers.encode(value);
            yield engine.setRemove(setName, value);
            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining(`test/sets/${setName}/${encodedValue}`));
        }));
        it('should clear a set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: 'test/sets/testSet/value1' },
                { Key: 'test/sets/testSet/value2' }
            ];
            s3Helper.list.mockResolvedValue(items);
            yield engine.setClear(setName);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(s3Helper.deleteAll).toHaveBeenCalledTimes(1);
            expect(s3Helper.deleteAll).toHaveBeenCalledWith(items);
        }));
    });
    describe('Key-Value Operations', () => {
        it('should set a key-value pair', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            const value = 'testValue';
            yield engine.set(key, value);
            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(value, expect.stringContaining('test/keyval/testKey'));
        }));
        it('should get a value by key', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            const value = 'testValue';
            s3Helper.get.mockResolvedValue(value);
            const result = yield engine.get(key);
            expect(s3Helper.get).toHaveBeenCalledTimes(1);
            expect(result).toBe(value);
        }));
        it('should delete a key-value pair', () => __awaiter(void 0, void 0, void 0, function* () {
            const key = 'testKey';
            yield engine.del(key);
            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining('test/keyval/testKey'));
        }));
        it('should delete multiple keys in batch', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = ['key1', 'key2'];
            const expectedDeleteList = keys.map(key => ({
                Key: `test/keyval/${key}`
            }));
            yield engine.delBatch(keys);
            expect(s3Helper.deleteAll).toHaveBeenCalledTimes(1);
            expect(s3Helper.deleteAll).toHaveBeenCalledWith(expectedDeleteList);
        }));
        it('should handle empty batch delete', () => __awaiter(void 0, void 0, void 0, function* () {
            yield engine.delBatch([]);
            expect(s3Helper.deleteAll).not.toHaveBeenCalled();
        }));
    });
    describe('Set Member Operations', () => {
        it('should get set members', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/sets/${setName}/dGVzdFZhbHVlMQ` },
                { Key: `test/sets/${setName}/dGVzdFZhbHVlMg` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const result = yield engine.setMembers(setName);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(['testValue1', 'testValue2']);
        }));
        it('should get intersection of sets', () => __awaiter(void 0, void 0, void 0, function* () {
            const setNames = ['set1', 'set2'];
            s3Helper.list.mockResolvedValueOnce([
                { Key: 'test/sets/set1/dGVzdFZhbHVlMQ' },
                { Key: 'test/sets/set1/dGVzdFZhbHVlMg' }
            ]);
            s3Helper.list.mockResolvedValueOnce([
                { Key: 'test/sets/set2/dGVzdFZhbHVlMQ' },
                { Key: 'test/sets/set2/dGVzdFZhbHVlMw' }
            ]);
            const result = yield engine.setIntersection(setNames);
            expect(s3Helper.list).toHaveBeenCalledTimes(2);
            expect(result).toEqual(['testValue1']);
        }));
    });
    describe('Sorted Set Operations', () => {
        it('should add to sorted set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const score = 100;
            const value = 'testValue';
            const meta = 'testMeta';
            yield engine.zSetAdd(setName, score, value, meta);
            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(meta, expect.stringContaining(`test/zsets/${setName}/${score}###${EngineHelpers_1.EngineHelpers.encode(value)}`));
        }));
        it('should handle boolean meta in sorted set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const score = 100;
            const value = 'testValue';
            const meta = false;
            yield engine.zSetAdd(setName, score, value, meta);
            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith('false', expect.stringContaining(`test/zsets/${setName}/${score}###${EngineHelpers_1.EngineHelpers.encode(value)}`));
        }));
        it('should remove from sorted set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const score = 100;
            const value = 'testValue';
            yield engine.zSetRemove(setName, score, value);
            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining(`test/zsets/${setName}/${score}###${EngineHelpers_1.EngineHelpers.encode(value)}`));
        }));
        it('should get max value from sorted set without scores', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const result = yield engine.zGetMax(setName);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toBe('value2');
        }));
        it('should get max value from sorted set with scores', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const result = yield engine.zGetMax(setName, true);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                score: 200,
                val: 'value2'
            });
        }));
        it('should get sorted set members without scores', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const result = yield engine.zSetMembers(setName);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(['value1', 'value2']);
        }));
        it('should get sorted set members with scores', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const result = yield engine.zSetMembers(setName, true);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
                { score: 100, val: 'value1' },
                { score: 200, val: 'value2' }
            ]);
        }));
        it('should clear sorted set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` }
            ];
            const expireItems = [
                { Key: `test/zsets/${setName}/expires/item1` },
                { Key: `test/zsets/${setName}/expires/item2` }
            ];
            s3Helper.list.mockResolvedValueOnce(items);
            s3Helper.list.mockResolvedValueOnce(expireItems);
            yield engine.zSetClear(setName);
            expect(s3Helper.list).toHaveBeenCalledTimes(2);
            expect(s3Helper.deleteAll).toHaveBeenCalledTimes(2);
            expect(s3Helper.deleteAll).toHaveBeenNthCalledWith(1, items);
            expect(s3Helper.deleteAll).toHaveBeenNthCalledWith(2, expireItems);
        }));
        it('should get range from sorted set', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` },
                { Key: `test/zsets/${setName}/300###${EngineHelpers_1.EngineHelpers.encode('value3')}` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const query = {
                $gt: 100,
                $lt: 300
            };
            const result = yield engine.zRange(setName, query);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
                { score: 200, val: 'value2' }
            ]);
        }));
        it('should throw error when no range specifiers provided', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const query = {};
            yield expect(engine.zRange(setName, query)).rejects.toThrow('You need to set at least one range specifier ($lt, $lte, $gt, $gte)!');
        }));
        it('should handle inclusive range bounds', () => __awaiter(void 0, void 0, void 0, function* () {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers_1.EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers_1.EngineHelpers.encode('value2')}` },
                { Key: `test/zsets/${setName}/300###${EngineHelpers_1.EngineHelpers.encode('value3')}` }
            ];
            s3Helper.list.mockResolvedValue(items);
            const query = {
                $gte: 100,
                $lte: 300
            };
            const result = yield engine.zRange(setName, query);
            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
                { score: 100, val: 'value1' },
                { score: 200, val: 'value2' },
                { score: 300, val: 'value3' }
            ]);
        }));
    });
});
//# sourceMappingURL=AwsEngine.test.js.map