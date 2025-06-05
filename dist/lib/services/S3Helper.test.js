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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const stream_1 = require("stream");
const util_stream_node_1 = require("@aws-sdk/util-stream-node");
const S3Helper_1 = require("./S3Helper");
const AuthError_1 = __importDefault(require("../../lib/errors/AuthError"));
const s3Mock = (0, aws_sdk_client_mock_1.mockClient)(client_s3_1.S3Client);
describe('S3Helper', () => {
    let s3Helper;
    beforeEach(() => {
        s3Mock.reset();
        s3Helper = new S3Helper_1.S3Helper({
            bucket: 'test-bucket',
            prefix: 'test-prefix',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
        });
    });
    describe('constructor', () => {
        it('should throw error if no options provided', () => {
            expect(() => new S3Helper_1.S3Helper(null)).toThrow('You must pass configuration settings!');
        });
        it('should throw error if no bucket specified', () => {
            expect(() => new S3Helper_1.S3Helper({})).toThrow('No AWS Bucket specified!');
        });
        it('should set default values', () => {
            const helper = new S3Helper_1.S3Helper({
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
        it('should list objects in directory', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockObjects = [
                { Key: 'test/file1.txt' },
                { Key: 'test/file2.txt' }
            ];
            s3Mock.on(client_s3_1.ListObjectsV2Command).resolves({
                Contents: mockObjects
            });
            const result = yield s3Helper.list('test/');
            expect(result).toEqual(mockObjects);
        }));
        it('should return empty array when no objects found', () => __awaiter(void 0, void 0, void 0, function* () {
            s3Mock.on(client_s3_1.ListObjectsV2Command).resolves({});
            const result = yield s3Helper.list('test/');
            expect(result).toEqual([]);
        }));
    });
    describe('exists', () => {
        it('should return true when object exists', () => __awaiter(void 0, void 0, void 0, function* () {
            s3Mock.on(client_s3_1.HeadObjectCommand).resolves({});
            const result = yield s3Helper.exists('test/file.txt');
            expect(result).toBe(true);
        }));
        it('should return false when object does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            s3Mock.on(client_s3_1.HeadObjectCommand).rejects(new Error('Not found'));
            const result = yield s3Helper.exists('test/file.txt');
            expect(result).toBe(false);
        }));
    });
    describe('get', () => {
        it('should get file content', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockContent = Buffer.from('test content');
            const mockStream = (0, util_stream_node_1.sdkStreamMixin)(stream_1.Readable.from([mockContent]));
            s3Mock.on(client_s3_1.GetObjectCommand).resolves({
                Body: mockStream
            });
            const result = yield s3Helper.get('test/file.txt');
            expect(result).toBe('test content');
        }), 10000); // Increase timeout to 10 seconds
        it('should throw error for invalid body type', () => __awaiter(void 0, void 0, void 0, function* () {
            s3Mock.on(client_s3_1.GetObjectCommand).resolves({
                Body: undefined
            });
            yield expect(s3Helper.get('test/file.txt')).rejects.toThrow('Invalid response body type');
        }));
    });
    describe('uploadString', () => {
        it('should throw AuthError when not authenticated', () => __awaiter(void 0, void 0, void 0, function* () {
            const unauthenticatedHelper = new S3Helper_1.S3Helper({
                bucket: 'test-bucket',
                prefix: 'test-prefix',
                accessKeyId: '',
                secretAccessKey: ''
            });
            yield expect(unauthenticatedHelper.uploadString('content', 'test.txt'))
                .rejects.toThrow(AuthError_1.default);
        }));
        it('should upload string content', () => __awaiter(void 0, void 0, void 0, function* () {
            s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
            const result = yield s3Helper.uploadString('test content', 'test/file.txt');
            expect(result).toBe('https://test-bucket.s3.amazonaws.com/test/file.txt');
        }));
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
//# sourceMappingURL=S3Helper.test.js.map