"use strict";
import {map} from "lodash";
import AWS from 'aws-sdk';
import Logger from "../utils/Logger";
import AuthError from "../errors/AuthError";

/**
 * Class to simplify working with Amazon services
 */
class S3Helper {

    /**
     * 
     * @param {*} opts {bucket,region,accessKeyId,secretAccessKey }
     */
    constructor(opts){

        if (!opts){
            throw new Error('You must pass configuration settings!');
        }

        // Make sure we have the settings we need
        if (!opts.bucket){
            throw new Error('No AWS Bucket specified!')
        }

        opts.region = (opts.region) ? opts.region : "us-east-1";
        opts.baseUrl = (opts.rootUrl) ? opts.rootUrl : `https://${opts.bucket}.s3.amazonaws.com`;
        opts.acl = (opts && opts.acl) ? opts.acl : 'private';
        
        this.opts = opts;
        this.authenticated = false;

        // If we have the credentials, try to authenticate
        if (opts.accessKeyId && opts.secretAccessKey){
            // init aws
            try {
                //console.log('AWS opts = ', this.opts)
                AWS.config.update(this.opts);
                this.authenticated = true;
            }
            catch(err){
                console.error(err);
                this.authenticated = false;
            }

        }

        this.s3 = new AWS.S3({})

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    getBucket(){ return this.opts.bucket }
    getRegion(){ return this.opts.region }
    getUrl(key){ 
        key = key.replace(/^\//, '');
        return `${this.opts.baseUrl}/${key}` 
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////
    //
    // Anonymous
    //
    // ///////////////////////////////////////////////////////////////////////////////////////////

    _read(cmd, params){

        return new Promise((resolve, reject) => {     

            if (this.authenticated){
                this.s3[cmd](params, function(err, data) {
                    if (err) {
                        resolve(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            }  
            else {
                this.s3.makeUnauthenticatedRequest(cmd, params, function(err, data) {
                    if (err) {
                        resolve(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            }

        })   

    }

    _write(cmd, params){

        return new Promise((resolve, reject) => {     

            if (!this.authenticated){
                throw new AuthError(`You need to be authenticated to call ${cmd}`);
            }  

            this.s3[cmd](params, function(err, data) {
                if (err) {
                    resolve(err);
                }
                else {
                    resolve(data);
                }
            });

        })   

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
     * @param {*} directoryKey 
     * @returns 
     */
     async list(directoryKey) {

        const params = {
            Delimiter: '/',
            //EncodingType: 'url',
            //Marker: 'STRING_VALUE',
            //MaxKeys: 0,
            Prefix: directoryKey,
            Bucket: this.opts.bucket
        };

        let data = await this._read('listObjectsV2', params);
        return data.Contents;
 
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Check that a file exists
    * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property
    */
    async exists(key){

        const params = {
            Key: key,
            Bucket: this.opts.bucket
        };

        try {
            await this._read('headObject', params);
            return true;
        }
        catch(err){
            return false;
        }
 
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Get a file
    * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    */
    async get(key) {
        Logger.debug('get = ', key);
        let data = await this._read('getObject', { Bucket: this.opts.bucket, Key: key });
        Logger.debug('data = ', data);
        return data.Body.toString('utf-8');
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    async getObjectACL(key){

        const params = {
            Bucket: this.opts.bucket,
            //GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers", 
            Key: key
        };

        let data = await this._read('getObjectACL', params);
        return data.Contents;
    }
    
    // ///////////////////////////////////////////////////////////////////////////////////////////
    //
    // Authenticated
    //
    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get a signed URL to a resource on S3
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
     */
    async getSignedUrl(key) {

        return new Promise((resolve, reject) => {            
            this.s3.getSignedUrl('getObject', {Bucket: this.opts.bucket, Key: key}, (err, obj)=>{
                if (err){
                    return reject(err)
                }
                return resolve(obj)
            })
        })  

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 
     * @param {*} key 
     * @param {string} acl private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
     */
    async setObjectACL(key, acl){

        const params = {
            //ACL: acl,
            Bucket: this.opts.bucket,
            GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers", 
            Key: key
        };

        return await this._write('putObjectAcl', params);

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Upload a file to AWS, using multipart upload to handle large files.
     * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html
     *
     * @params {string} content The string content
     * @params {string} buckey The s3 bucket
     * @params {string} key The s3 key (e.g. the path on S3)
     * @params {function} onDone Callback for when the file has been uploaded
     * @params {function} onProgress Callback called when there is a progress update
     */
    async uploadString(content, key, contentType) {

        if (!this.authenticated){
            throw new AuthError(`You need to be authenticated to call uploadString!`);
        }  
        
        if (!contentType){
            contentType = 'text/plain';
        }

        // Remove any slashes at the start or end of string
        key = key.replace(/^\/|\/$/g, '');

        //Logger.debug("Uploading " + fileName + " to S3: " + key);
        
        var options = {
            partSize: 10 * 1024 * 1024,
            queueSize: 1
        };

        const params = {
            ACL: this.opts.acl,
            Bucket: this.opts.bucket,
            Key: key,
            Body: content,
            ContentType: contentType
        };
            
            
        return new Promise((resolve, reject) => {    

            this.s3.upload(params, options)
                //.on('httpUploadProgress', function(progress) {
                //    Logger.debug("Progress:", progress);
                //    if (onProgress){
                //        onProgress(progress);
                //    }
                //})
                .send(function(err, data) {
                    if (err){
                        return reject(err)
                    }
                    //Logger.debug("File uploaded:", data);
                    return resolve(key);
                });
        })

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Delete a file on S3
     */
    async delete(key) {

        const params = {
            Bucket: this.opts.bucket,
            Key: key
        };

        return await this._write('deleteObject', params);

    }

    /**
     * Delete all items from s3
     * @param {object} items An object, with at minimum a Key field (i.e. the outout of a list)
     * @returns 
     */
    async deleteAll(items) {

        // Remove anything from the items list that isn't a Key or VersionId
        let cleaned = map(items, (item)=>{
            return {
                Key: item.Key,
                VersionId: item.VersionId
            }
        });

        const params = {
            Bucket: this.opts.bucket,
            Delete: {                    
                Objects: cleaned
            }
        };

        return await this._write('deleteObjects', params);

    }    

}

export default S3Helper;

