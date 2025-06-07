import Logger from "../utils/Logger";
import {AwsEngine} from "./AwsEngine";
import {S3Helper, S3Options} from "../services/S3Helper";
import {type ConfigOptions, StashDefaultConfig} from "../types";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Connection class that manages the connection to the back-end storage engine
 * and provides access to the engine (for now only AWS supported, but other
 * S3 compatible engines could be added in the future)
 */
export class Stash {

    static debug: boolean = false;
    static engine: AwsEngine;
    static indexingEngine: string = 'basic';
    static rootPath: string = "";
    private static _aws: S3Helper;

    static connect(opts: ConfigOptions) {
        //Logger.debug(`Connection.init()`);

        const s3Opts:S3Options = {
            bucket: (opts.bucket) ? opts.bucket : StashDefaultConfig.bucket,
            prefix: (opts.prefix) ? opts.prefix : StashDefaultConfig.prefix,
            region: (opts.region) ? opts.region : StashDefaultConfig.region,
            rootUrl: (opts.rootUrl) ? opts.rootUrl : StashDefaultConfig.rootUrl,
            sessionToken: (opts.sessionToken) ? opts.sessionToken : StashDefaultConfig.sessionToken,
            //acl: (opts.acl) ? opts.acl : 'private',
            acl: 'private',
            accessKeyId: (opts.accessKeyId) ? opts.accessKeyId : StashDefaultConfig.accessKeyId,
            secretAccessKey: (opts.secretAccessKey) ? opts.secretAccessKey : StashDefaultConfig.secretAccessKey,
        }        

        if (opts.s3Client instanceof S3Client){
            this._aws = new S3Helper(opts as S3Client);
            this.engine = new AwsEngine(s3Opts);            
        } 
        else {
            this._aws = new S3Helper(s3Opts);
            this.engine = new AwsEngine(s3Opts);
                        
        }


        this.indexingEngine = opts.indexingEngine || 'basic';
        this.rootPath = opts.prefix || '';
        
        if (this.rootPath && this.rootPath.slice(-1) !== '/'){
            this.rootPath += '/';
        }
    }

    static aws(): S3Helper{
        if (!this._aws){
            throw new Error('You must call Connection.init() before using the S3 engine');
        }
        return this._aws;        
    }

    /**
     * Return the connection to the current S3 engine
     * @returns 
     */
    static s3(): AwsEngine{
        if (!this.engine){
            throw new Error('You must call Connection.init() before using the S3 engine');
        }
        return this.engine;
    }

}