import { AwsEngine } from '../../lib/core/AwsEngine';
import { S3Helper, type S3Options } from '../../lib/services/S3Helper';
import { EngineHelpers } from '../../lib/core/EngineHelpers';
import { Query } from '../../lib/types';

jest.mock('../../lib/services/S3Helper');

describe('AwsEngine', () => {
    let engine: AwsEngine;
    let s3Helper: jest.Mocked<S3Helper>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Create a mocked instance of S3Helper
        s3Helper = new S3Helper({} as S3Options) as jest.Mocked<S3Helper>;
        const s3Options: S3Options = {
            bucket: 'test-bucket',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            prefix: 'test/'
        };
        engine = new AwsEngine(s3Options);
        // Replace the real S3Helper with our mock
        (engine as any).aws = s3Helper;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('Object Operations', () => {
        it('should set an object', async () => {
            const key = 'testKey';
            const obj = { test: 'data' };
            
            await engine.setObject(key, obj);
            
            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(JSON.stringify(obj), expect.stringContaining('test/hash/testKey'));
        });

        it('should get an object', async () => {
            const key = 'testKey';
            const obj = { test: 'data' };
            s3Helper.get.mockResolvedValue(JSON.stringify(obj));

            const result = await engine.getObject(key);

            expect(s3Helper.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(obj);
        });

        it('should check if object exists', async () => {
            const key = 'testKey';
            s3Helper.exists.mockResolvedValue(true);

            const result = await engine.hasObject(key);

            expect(s3Helper.exists).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should delete an object', async () => {
            const key = 'testKey';
            
            await engine.delObject(key);

            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining('test/hash/testKey'));
        });
    });

    describe('Set Operations', () => {
        it('should add to a set', async () => {
            const setName = 'testSet';
            const value = 'testValue';
            const meta = 'testMeta';
            const encodedValue = EngineHelpers.encode(value);

            await engine.setAdd(setName, value, meta);

            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(meta, expect.stringContaining(`test/sets/${setName}/${encodedValue}`));
        });

        it('should check set membership', async () => {
            const setName = 'testSet';
            const value = 'testValue';
            s3Helper.exists.mockResolvedValue(true);

            const result = await engine.setIsMember(setName, value);

            expect(s3Helper.exists).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should remove from a set', async () => {
            const setName = 'testSet';
            const value = 'testValue';
            const encodedValue = EngineHelpers.encode(value);

            await engine.setRemove(setName, value);

            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining(`test/sets/${setName}/${encodedValue}`));
        });

        it('should clear a set', async () => {
            const setName = 'testSet';
            const items = [
                { Key: 'test/sets/testSet/value1' },
                { Key: 'test/sets/testSet/value2' }
            ];
            s3Helper.list.mockResolvedValue(items);

            await engine.setClear(setName);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(s3Helper.deleteAll).toHaveBeenCalledTimes(1);
            expect(s3Helper.deleteAll).toHaveBeenCalledWith(items);
        });
    });

    describe('Key-Value Operations', () => {
        it('should set a key-value pair', async () => {
            const key = 'testKey';
            const value = 'testValue';

            await engine.set(key, value);

            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(value, expect.stringContaining('test/keyval/testKey'));
        });

        it('should get a value by key', async () => {
            const key = 'testKey';
            const value = 'testValue';
            s3Helper.get.mockResolvedValue(value);

            const result = await engine.get(key);

            expect(s3Helper.get).toHaveBeenCalledTimes(1);
            expect(result).toBe(value);
        });

        it('should delete a key-value pair', async () => {
            const key = 'testKey';

            await engine.del(key);

            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(expect.stringContaining('test/keyval/testKey'));
        });

        it('should delete multiple keys in batch', async () => {
            const keys = ['key1', 'key2'];
            const expectedDeleteList = keys.map(key => ({
                Key: `test/keyval/${key}`
            }));

            await engine.delBatch(keys);

            expect(s3Helper.deleteAll).toHaveBeenCalledTimes(1);
            expect(s3Helper.deleteAll).toHaveBeenCalledWith(expectedDeleteList);
        });

        it('should handle empty batch delete', async () => {
            await engine.delBatch([]);
            expect(s3Helper.deleteAll).not.toHaveBeenCalled();
        });
    });

    describe('Set Member Operations', () => {
        it('should get set members', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/sets/${setName}/dGVzdFZhbHVlMQ` },
                { Key: `test/sets/${setName}/dGVzdFZhbHVlMg` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const result = await engine.setMembers(setName);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(['testValue1', 'testValue2']);
        });

        it('should get intersection of sets', async () => {
            const setNames = ['set1', 'set2'];
            s3Helper.list.mockResolvedValueOnce([
                { Key: 'test/sets/set1/dGVzdFZhbHVlMQ' },
                { Key: 'test/sets/set1/dGVzdFZhbHVlMg' }
            ]);
            s3Helper.list.mockResolvedValueOnce([
                { Key: 'test/sets/set2/dGVzdFZhbHVlMQ' },
                { Key: 'test/sets/set2/dGVzdFZhbHVlMw' }
            ]);

            const result = await engine.setIntersection(setNames);

            expect(s3Helper.list).toHaveBeenCalledTimes(2);
            expect(result).toEqual(['testValue1']);
        });
    });

    describe('Sorted Set Operations', () => {
        it('should add to sorted set', async () => {
            const setName = 'testSet';
            const score = 100;
            const value = 'testValue';
            const meta = 'testMeta';

            await engine.zSetAdd(setName, score, value, meta);

            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(
                meta,
                expect.stringContaining(`test/zsets/${setName}/${score}###${EngineHelpers.encode(value)}`)
            );
        });

        it('should handle boolean meta in sorted set', async () => {
            const setName = 'testSet';
            const score = 100;
            const value = 'testValue';
            const meta = false;

            await engine.zSetAdd(setName, score, value, meta);

            expect(s3Helper.uploadString).toHaveBeenCalledTimes(1);
            expect(s3Helper.uploadString).toHaveBeenCalledWith(
                'false',
                expect.stringContaining(`test/zsets/${setName}/${score}###${EngineHelpers.encode(value)}`)
            );
        });

        it('should remove from sorted set', async () => {
            const setName = 'testSet';
            const score = 100;
            const value = 'testValue';

            await engine.zSetRemove(setName, score, value);

            expect(s3Helper.delete).toHaveBeenCalledTimes(1);
            expect(s3Helper.delete).toHaveBeenCalledWith(
                expect.stringContaining(`test/zsets/${setName}/${score}###${EngineHelpers.encode(value)}`)
            );
        });

        it('should get max value from sorted set without scores', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const result = await engine.zGetMax(setName);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toBe('value2');
        });

        it('should get max value from sorted set with scores', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const result = await engine.zGetMax(setName, true);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                score: 200,
                val: 'value2'
            });
        });

        it('should get sorted set members without scores', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const result = await engine.zSetMembers(setName);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(['value1', 'value2']);
        });

        it('should get sorted set members with scores', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const result = await engine.zSetMembers(setName, true);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
                { score: 100, val: 'value1' },
                { score: 200, val: 'value2' }
            ]);
        });

        it('should clear sorted set', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` }
            ];
            const expireItems = [
                { Key: `test/zsets/${setName}/expires/item1` },
                { Key: `test/zsets/${setName}/expires/item2` }
            ];
            s3Helper.list.mockResolvedValueOnce(items);
            s3Helper.list.mockResolvedValueOnce(expireItems);

            await engine.zSetClear(setName);

            expect(s3Helper.list).toHaveBeenCalledTimes(2);
            expect(s3Helper.deleteAll).toHaveBeenCalledTimes(2);
            expect(s3Helper.deleteAll).toHaveBeenNthCalledWith(1, items);
            expect(s3Helper.deleteAll).toHaveBeenNthCalledWith(2, expireItems);
        });

        it('should get range from sorted set', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` },
                { Key: `test/zsets/${setName}/300###${EngineHelpers.encode('value3')}` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const query: Query = {
                $gt: 100,
                $lt: 300
            };
            const result = await engine.zRange(setName, query);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
                { score: 200, val: 'value2' }
            ]);
        });

        it('should throw error when no range specifiers provided', async () => {
            const setName = 'testSet';
            const query: Query = {};
            
            await expect(engine.zRange(setName, query)).rejects.toThrow(
                'You need to set at least one range specifier ($lt, $lte, $gt, $gte)!'
            );
        });

        it('should handle inclusive range bounds', async () => {
            const setName = 'testSet';
            const items = [
                { Key: `test/zsets/${setName}/100###${EngineHelpers.encode('value1')}` },
                { Key: `test/zsets/${setName}/200###${EngineHelpers.encode('value2')}` },
                { Key: `test/zsets/${setName}/300###${EngineHelpers.encode('value3')}` }
            ];
            s3Helper.list.mockResolvedValue(items);

            const query: Query = {
                $gte: 100,
                $lte: 300
            };
            const result = await engine.zRange(setName, query);

            expect(s3Helper.list).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
                { score: 100, val: 'value1' },
                { score: 200, val: 'value2' },
                { score: 300, val: 'value3' }
            ]);
        });
    });
});
