import Logger from "../utils/Logger";
import {AwsEngine} from "./AwsEngine";
import {S3Helper} from "../services/S3Helper";
import {type S3Options} from "../services/S3Helper";
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Connection class that manages the connection to the back-end storage engine
 * and provides access to the engine (for now only AWS supported, but other
 * S3 compatible engines could be added in the future)
 */
export class Storm {

    static debug: boolean = false;
    static engine: AwsEngine;
    static rootPath: string = "s3orm/";
    private static _aws: S3Helper;

    static connect(opts: S3Options){
        //Logger.debug(`Connection.init()`);
        this._aws = new S3Helper(opts);
        this.engine = new AwsEngine(opts);
        this.rootPath = opts.prefix;
        if (this.rootPath.slice(-1) !== '/'){
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