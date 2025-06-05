import { S3Client, _Object as S3Object, ObjectCannedACL } from "@aws-sdk/client-s3";
export type S3Options = {
    bucket: string;
    prefix: string;
    region?: string;
    rootUrl?: string;
    acl?: ObjectCannedACL;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
};
/**
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
 * Class to simplify working with Amazon services
 */
export declare class S3Helper {
    opts: S3Options;
    authenticated: boolean;
    s3: S3Client;
    /**
     *
     * @param {*} opts {bucket,region,baseUrl,accessKeyId,secretAccessKey }
     */
    constructor(opts: S3Options | S3Client);
    getBucket(): string;
    getRegion(): string;
    getUrl(key: string): string;
    _read(command: any): Promise<any>;
    _write(command: any): Promise<any>;
    /**
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/ListObjectsV2Command/
     */
    list(directoryKey: string): Promise<S3Object[]>;
    /**
    * Check that a file exists
    */
    exists(key: string): Promise<boolean>;
    /**
    * Get a file
    */
    get(key: string): Promise<string>;
    getObjectACL(key: string): Promise<any>;
    /**
     * Get a signed URL to a resource on S3
     */
    getSignedUrl(key: string): Promise<string>;
    /**
     * @param {string} key
     * @param {ObjectCannedACL} acl private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
     */
    setObjectACL(key: string, acl: ObjectCannedACL): Promise<any>;
    /**
     * Upload a file to AWS
     * @param {string} content The string content
     * @param {string} key The s3 key (e.g. the path on S3)
     * @param {string} contentType Content type of the file
     */
    uploadString(content: string, key: string, contentType?: string): Promise<string>;
    /**
     * Delete a file on S3
     */
    delete(key: string): Promise<any>;
    /**
     * Delete multiple objects from s3
     * @param {S3Object[]} items Array of S3 objects from list() command
     */
    deleteAll(items: S3Object[]): Promise<any>;
}
//# sourceMappingURL=S3Helper.d.ts.map