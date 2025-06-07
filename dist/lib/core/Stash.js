"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stash = void 0;
const AwsEngine_1 = require("./AwsEngine");
const S3Helper_1 = require("../services/S3Helper");
const types_1 = require("../types");
const client_s3_1 = require("@aws-sdk/client-s3");
/**
 * Connection class that manages the connection to the back-end storage engine
 * and provides access to the engine (for now only AWS supported, but other
 * S3 compatible engines could be added in the future)
 */
class Stash {
    static connect(opts) {
        //Logger.debug(`Connection.init()`);
        const s3Opts = {
            bucket: (opts.bucket) ? opts.bucket : types_1.StashDefaultConfig.bucket,
            prefix: (opts.prefix) ? opts.prefix : types_1.StashDefaultConfig.prefix,
            region: (opts.region) ? opts.region : types_1.StashDefaultConfig.region,
            rootUrl: (opts.rootUrl) ? opts.rootUrl : types_1.StashDefaultConfig.rootUrl,
            sessionToken: (opts.sessionToken) ? opts.sessionToken : types_1.StashDefaultConfig.sessionToken,
            //acl: (opts.acl) ? opts.acl : 'private',
            acl: 'private',
            accessKeyId: (opts.accessKeyId) ? opts.accessKeyId : types_1.StashDefaultConfig.accessKeyId,
            secretAccessKey: (opts.secretAccessKey) ? opts.secretAccessKey : types_1.StashDefaultConfig.secretAccessKey,
        };
        if (opts.s3Client instanceof client_s3_1.S3Client) {
            this._aws = new S3Helper_1.S3Helper(opts);
            this.engine = new AwsEngine_1.AwsEngine(s3Opts);
        }
        else {
            this._aws = new S3Helper_1.S3Helper(s3Opts);
            this.engine = new AwsEngine_1.AwsEngine(s3Opts);
        }
        this.indexingEngine = opts.indexingEngine || 'basic';
        this.rootPath = opts.prefix || '';
        if (this.rootPath && this.rootPath.slice(-1) !== '/') {
            this.rootPath += '/';
        }
    }
    static aws() {
        if (!this._aws) {
            throw new Error('You must call Connection.init() before using the S3 engine');
        }
        return this._aws;
    }
    /**
     * Return the connection to the current S3 engine
     * @returns
     */
    static s3() {
        if (!this.engine) {
            throw new Error('You must call Connection.init() before using the S3 engine');
        }
        return this.engine;
    }
}
exports.Stash = Stash;
Stash.debug = false;
Stash.indexingEngine = 'basic';
Stash.rootPath = "";
//# sourceMappingURL=Stash.js.map