import { AwsEngine } from "./AwsEngine";
import { S3Helper } from "../services/S3Helper";
import { type ConfigOptions } from "../types";
/**
 * Connection class that manages the connection to the back-end storage engine
 * and provides access to the engine (for now only AWS supported, but other
 * S3 compatible engines could be added in the future)
 */
export declare class Stash {
    static debug: boolean;
    static engine: AwsEngine;
    static indexingEngine: string;
    static rootPath: string;
    private static _aws;
    static connect(opts: ConfigOptions): void;
    static aws(): S3Helper;
    /**
     * Return the connection to the current S3 engine
     * @returns
     */
    static s3(): AwsEngine;
}
//# sourceMappingURL=Stash.d.ts.map