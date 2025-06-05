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
exports.S3Helper = void 0;
const lodash_1 = require("lodash");
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const stream_1 = require("stream");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const AuthError_1 = __importDefault(require("../errors/AuthError"));
/**
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
 * Class to simplify working with Amazon services
 */
class S3Helper {
    /**
     *
     * @param {*} opts {bucket,region,baseUrl,accessKeyId,secretAccessKey }
     */
    constructor(opts) {
        this.authenticated = false;
        if (!opts) {
            throw new Error('You must pass configuration settings!');
        }
        // If we have an S3Client instance, use it directly
        if (opts instanceof client_s3_1.S3Client) {
            this.s3 = opts;
        }
        else {
            // Make sure we have the settings we need
            if (!opts.bucket) {
                throw new Error('No AWS Bucket specified!');
            }
            opts.region = (opts.region) ? opts.region : "us-east-1";
            opts.rootUrl = (opts.rootUrl) ? opts.rootUrl : `https://${opts.bucket}.s3.amazonaws.com`;
            opts.acl = (opts && opts.acl) ? opts.acl : 'private';
            this.opts = opts;
            this.authenticated = false;
            const clientConfig = {
                region: opts.region
            };
            // If we have the credentials, try to authenticate
            if (opts.accessKeyId && opts.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: opts.accessKeyId,
                    secretAccessKey: opts.secretAccessKey,
                    sessionToken: (opts.sessionToken) ? opts.sessionToken : null // Optional, for temporary credentials
                };
                this.authenticated = true;
            }
            this.s3 = new client_s3_1.S3Client(clientConfig);
        }
    }
    getBucket() { return this.opts.bucket; }
    getRegion() { return this.opts.region; }
    getUrl(key) {
        key = key.replace(/^\//, '');
        return `${this.opts.rootUrl}/${key}`;
    }
    _read(command) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.s3.send(command);
                return response;
            }
            catch (err) {
                //Logger.error('S3 read error:', err);
                throw err;
            }
        });
    }
    _write(command) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.authenticated) {
                throw new AuthError_1.default(`You need to be authenticated for this operation`);
            }
            try {
                const response = yield this.s3.send(command);
                return response;
            }
            catch (err) {
                //Logger.error('S3 write error:', err);
                throw err;
            }
        });
    }
    /**
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/ListObjectsV2Command/
     */
    list(directoryKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.ListObjectsV2Command({
                Delimiter: '/',
                Prefix: directoryKey,
                Bucket: this.opts.bucket,
            });
            const response = yield this._read(command);
            return response.Contents || [];
        });
    }
    /**
    * Check that a file exists
    */
    exists(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.opts.bucket,
                Key: key
            });
            try {
                yield this._read(command);
                return true;
            }
            catch (err) {
                return false;
            }
        });
    }
    /**
    * Get a file
    */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.opts.bucket,
                Key: key
            });
            const response = yield this._read(command);
            const streamToString = (stream) => __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on("data", (chunk) => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
                });
            });
            if (response.Body instanceof stream_1.Readable) {
                return yield streamToString(response.Body);
            }
            throw new Error('Invalid response body type');
        });
    }
    getObjectACL(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.GetObjectAclCommand({
                Bucket: this.opts.bucket,
                Key: key
            });
            const response = yield this._read(command);
            return response.Grants;
        });
    }
    /**
     * Get a signed URL to a resource on S3
     */
    getSignedUrl(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.opts.bucket,
                Key: key
            });
            return yield (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 3600 });
        });
    }
    /**
     * @param {string} key
     * @param {ObjectCannedACL} acl private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
     */
    setObjectACL(key, acl) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.PutObjectAclCommand({
                Bucket: this.opts.bucket,
                Key: key,
                ACL: acl
            });
            return yield this._write(command);
        });
    }
    /**
     * Upload a file to AWS
     * @param {string} content The string content
     * @param {string} key The s3 key (e.g. the path on S3)
     * @param {string} contentType Content type of the file
     */
    uploadString(content, key, contentType) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.authenticated) {
                throw new AuthError_1.default(`You need to be authenticated to call uploadString!`);
            }
            contentType = contentType || 'text/plain';
            key = key.replace(/^\/|\/$/g, '');
            const upload = new lib_storage_1.Upload({
                client: this.s3,
                params: {
                    Bucket: this.opts.bucket,
                    Key: key,
                    Body: content,
                    ContentType: contentType,
                    ACL: this.opts.acl
                }
            });
            yield upload.done();
            return this.getUrl(key);
        });
    }
    /**
     * Delete a file on S3
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.opts.bucket,
                Key: key
            });
            return yield this._write(command);
        });
    }
    /**
     * Delete multiple objects from s3
     * @param {S3Object[]} items Array of S3 objects from list() command
     */
    deleteAll(items) {
        return __awaiter(this, void 0, void 0, function* () {
            const cleaned = (0, lodash_1.map)(items, (item) => {
                const obj = { Key: item.Key || '' };
                return obj;
            });
            const command = new client_s3_1.DeleteObjectsCommand({
                Bucket: this.opts.bucket,
                Delete: {
                    Objects: cleaned
                }
            });
            return yield this._write(command);
        });
    }
}
exports.S3Helper = S3Helper;
//# sourceMappingURL=S3Helper.js.map