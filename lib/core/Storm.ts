import Logger from "../utils/Logger";
import {AwsEngine} from "./AwsEngine";
import {type S3Options} from "../services/S3Helper";
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Connection class that manages the connection to the back-end storage engine
 * and provides access to the engine (for now only AWS supported, but other
 * S3 compatible engines could be added in the future)
 */
export class Storm {

    static debug: boolean = true;
    static engine: AwsEngine;

    static connect(opts: S3Options){
        Logger.debug(`Connection.init()`);
        this.engine = new AwsEngine(opts);
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