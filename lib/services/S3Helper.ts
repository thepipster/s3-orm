import {map} from "lodash";
import { 
    S3Client, 
    ListObjectsV2Command,
    ListObjectsV2CommandOutput, 
    HeadObjectCommand,
    GetObjectCommand,
    GetObjectAclCommand,
    PutObjectAclCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    _Object as S3Object,
    GetObjectCommandOutput,
    ObjectIdentifier,
    ObjectCannedACL
} from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Logger from "../utils/Logger";
import AuthError from "../errors/AuthError";

export type S3Options = {
    bucket: string;
    prefix: string;
    region?: string;
    rootUrl?: string;
    acl?: ObjectCannedACL;
    accessKeyId: string;
    secretAccessKey: string;
}

/**
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
 * Class to simplify working with Amazon services
 */
export class S3Helper {

    opts: S3Options;
    authenticated: boolean = false;
    s3: S3Client;

    /**
     * 
     * @param {*} opts {bucket,region,baseUrl,accessKeyId,secretAccessKey }
     */
    constructor(opts: S3Options){

        if (!opts){
            throw new Error('You must pass configuration settings!');
        }

        // Make sure we have the settings we need
        if (!opts.bucket){
            throw new Error('No AWS Bucket specified!')
        }

        opts.region = (opts.region) ? opts.region : "us-east-1";
        opts.rootUrl = (opts.rootUrl) ? opts.rootUrl : `https://${opts.bucket}.s3.amazonaws.com`;
        opts.acl = (opts && opts.acl) ? opts.acl as ObjectCannedACL : 'private';
        
        this.opts = opts;
        this.authenticated = false;

        const clientConfig: any = {
            region: opts.region
        };

        // If we have the credentials, try to authenticate
        if (opts.accessKeyId && opts.secretAccessKey){
            clientConfig.credentials = {
                accessKeyId: opts.accessKeyId,
                secretAccessKey: opts.secretAccessKey
            };
            this.authenticated = true;
        }

        this.s3 = new S3Client(clientConfig);
    }

    getBucket(): string { return this.opts.bucket }
    
    getRegion(): string { return this.opts.region }

    getUrl(key: string): string { 
        key = key.replace(/^\//, '');
        return `${this.opts.rootUrl}/${key}` 
    }

    async _read(command: any): Promise<any> {
        try {
            const response = await this.s3.send(command);
            return response;
        } catch (err) {
            //Logger.error('S3 read error:', err);
            throw err;
        }
    }

    async _write(command: any): Promise<any> {
        if (!this.authenticated){
            throw new AuthError(`You need to be authenticated for this operation`);
        }  

        try {
            const response = await this.s3.send(command);
            return response;
        } catch (err) {
            //Logger.error('S3 write error:', err);
            throw err;
        }
    }

    /**
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/ListObjectsV2Command/
     */
    async list(directoryKey: string): Promise<S3Object[]> {
        const command = new ListObjectsV2Command({
            Delimiter: '/',
            Prefix: directoryKey,
            Bucket: this.opts.bucket
        });

        const response = await this._read(command) as ListObjectsV2CommandOutput;
        return response.Contents || [];
    }

    /**
    * Check that a file exists
    */
    async exists(key: string): Promise<boolean> {
        const command = new HeadObjectCommand({
            Bucket: this.opts.bucket,
            Key: key
        });

        try {
            await this._read(command);
            return true;
        } catch(err) {
            return false;
        }
    }

    /**
    * Get a file
    */
    async get(key: string): Promise<string> {

        const command = new GetObjectCommand({
            Bucket: this.opts.bucket,
            Key: key
        });

        const response = await this._read(command) as GetObjectCommandOutput;
        const streamToString = async (stream: Readable): Promise<string> => {
            return new Promise((resolve, reject) => {
                const chunks: Buffer[] = [];
                stream.on("data", (chunk: Buffer) => chunks.push(chunk));
                stream.on("error", reject);
                stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            });
        };

        if (response.Body instanceof Readable) {
            return await streamToString(response.Body);
        }
        throw new Error('Invalid response body type');
    }

    async getObjectACL(key: string): Promise<any> {
        const command = new GetObjectAclCommand({
            Bucket: this.opts.bucket,
            Key: key
        });

        const response = await this._read(command);
        return response.Grants;
    }

    /**
     * Get a signed URL to a resource on S3
     */
    async getSignedUrl(key: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.opts.bucket,
            Key: key
        });

        return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    }

    /**
     * @param {string} key 
     * @param {ObjectCannedACL} acl private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
     */
    async setObjectACL(key: string, acl: ObjectCannedACL): Promise<any> {
        const command = new PutObjectAclCommand({
            Bucket: this.opts.bucket,
            Key: key,
            ACL: acl
        });

        return await this._write(command);
    }

    /**
     * Upload a file to AWS
     * @param {string} content The string content
     * @param {string} key The s3 key (e.g. the path on S3)
     * @param {string} contentType Content type of the file
     */
    async uploadString(content: string, key: string, contentType?: string): Promise<string> {
        if (!this.authenticated){
            throw new AuthError(`You need to be authenticated to call uploadString!`);
        }  
        
        contentType = contentType || 'text/plain';
        key = key.replace(/^\/|\/$/g, '');

        const command = new PutObjectCommand({
            Bucket: this.opts.bucket,
            Key: key,
            Body: content,
            ContentType: contentType,
            ACL: this.opts.acl as ObjectCannedACL
        });

        await this._write(command);
        return this.getUrl(key);
    }

    /**
     * Delete a file on S3
     */
    async delete(key: string): Promise<any> {
        const command = new DeleteObjectCommand({
            Bucket: this.opts.bucket,
            Key: key
        });

        return await this._write(command);
    }

    /**
     * Delete multiple objects from s3
     * @param {S3Object[]} items Array of S3 objects from list() command
     */
    async deleteAll(items: S3Object[]): Promise<any> {
        const cleaned: ObjectIdentifier[] = map(items, (item) => {
            const obj: ObjectIdentifier = { Key: item.Key || '' };
            return obj;
        });

        const command = new DeleteObjectsCommand({
            Bucket: this.opts.bucket,
            Delete: {
                Objects: cleaned
            }
        });

        return await this._write(command);
    }
}
