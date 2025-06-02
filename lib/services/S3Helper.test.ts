import { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { Readable as NodeReadable } from 'stream';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import S3Helper from '../../lib/services/S3Helper';
import AuthError from '../../lib/errors/AuthError';

const s3Mock = mockClient(S3Client);

describe('S3Helper', () => {
    let s3Helper: S3Helper;

    beforeEach(() => {
        s3Mock.reset();
        s3Helper = new S3Helper({
            bucket: 'test-bucket',
            prefix: 'test-prefix',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
        });
    });

    describe('constructor', () => {
        it('should throw error if no options provided', () => {
            expect(() => new S3Helper(null as any)).toThrow('You must pass configuration settings!');
        });

        it('should throw error if no bucket specified', () => {
            expect(() => new S3Helper({} as any)).toThrow('No AWS Bucket specified!');
        });

        it('should set default values', () => {
            const helper = new S3Helper({ 
                bucket: 'test-bucket',
                prefix: 'test-prefix',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret'
            });
            expect(helper.getRegion()).toBe('us-east-1');
            expect(helper.getBucket()).toBe('test-bucket');
        });

        it('should mark as authenticated when credentials provided', () => {
            expect(s3Helper['authenticated']).toBe(true);
        });
    });

    describe('list', () => {
        it('should list objects in directory', async () => {
            const mockObjects = [
                { Key: 'test/file1.txt' },
                { Key: 'test/file2.txt' }
            ];

            s3Mock.on(ListObjectsV2Command).resolves({
                Contents: mockObjects
            });

            const result = await s3Helper.list('test/');
            expect(result).toEqual(mockObjects);
        });

        it('should return empty array when no objects found', async () => {
            s3Mock.on(ListObjectsV2Command).resolves({});
            const result = await s3Helper.list('test/');
            expect(result).toEqual([]);
        });
    });

    describe('exists', () => {
        it('should return true when object exists', async () => {
            s3Mock.on(HeadObjectCommand).resolves({});
            const result = await s3Helper.exists('test/file.txt');
            expect(result).toBe(true);
        });

        it('should return false when object does not exist', async () => {
            s3Mock.on(HeadObjectCommand).rejects(new Error('Not found'));
            const result = await s3Helper.exists('test/file.txt');
            expect(result).toBe(false);
        });
    });

    describe('get', () => {
        it('should get file content', async () => {
            const mockContent = Buffer.from('test content');
            const mockStream = sdkStreamMixin(NodeReadable.from([mockContent]));

            s3Mock.on(GetObjectCommand).resolves({
                Body: mockStream
            });

            const result = await s3Helper.get('test/file.txt');
            expect(result).toBe('test content');
        }, 10000); // Increase timeout to 10 seconds

        it('should throw error for invalid body type', async () => {
            s3Mock.on(GetObjectCommand).resolves({
                Body: undefined
            });

            await expect(s3Helper.get('test/file.txt')).rejects.toThrow('Invalid response body type');
        });
    });

    describe('uploadString', () => {
        it('should throw AuthError when not authenticated', async () => {
            const unauthenticatedHelper = new S3Helper({ 
                bucket: 'test-bucket',
                prefix: 'test-prefix',
                accessKeyId: '',
                secretAccessKey: ''
            });
            await expect(unauthenticatedHelper.uploadString('content', 'test.txt'))
                .rejects.toThrow(AuthError);
        });

        it('should upload string content', async () => {
            s3Mock.on(PutObjectCommand).resolves({});
            const result = await s3Helper.uploadString('test content', 'test/file.txt');
            expect(result).toBe('https://test-bucket.s3.amazonaws.com/test/file.txt');
        });
    });

    describe('getUrl', () => {
        it('should return correct URL', () => {
            expect(s3Helper.getUrl('test/file.txt'))
                .toBe('https://test-bucket.s3.amazonaws.com/test/file.txt');
        });

        it('should handle leading slash', () => {
            expect(s3Helper.getUrl('/test/file.txt'))
                .toBe('https://test-bucket.s3.amazonaws.com/test/file.txt');
        });
    });
});
