"use strict";

const Logger = require('../utils/Logger');
const mime = require('mime');
const fs = require('fs');
const tmp = require('tmp');
const _ = require('lodash');
const numeral = require('numeral');
const ProgressBar = require('progress');
const AWS = require('aws-sdk');

/**
 * Class to simplify working with Amazon services
 */
class AmazonHelper {

    /**
     * 
     * @param {*} opts {bucket,region,accessKeyId,secretAccessKey }
     */
    constructor(opts){

        var defaults = {
            bucket: process.env.AWS_BUCKET,
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_ACCESS_SECRET,
            baseUrl: process.env.AWS_CLOUDFRONT_URL_PUBLIC,
            //acl: 'public-read'
            acl: (opts && opts.acl) ? opts.acl : 'private'
        }

        
        var mergedSettings = _.merge({}, defaults, opts);
    

        // Make sure we have the settings we need
        if (!mergedSettings.bucket){
            throw new Error('No AWS Bucket specified!')
        }
        if (!mergedSettings.region){
            throw new Error('No AWS region specified!')
        }
        if (!mergedSettings.accessKeyId){
            throw new Error('No AWS accessKeyId specified!')
        }
        if (!mergedSettings.secretAccessKey){
            throw new Error('No AWS secretAccessKey specified!')
        }

        //Logger.debug('AWS Bucket = ', mergedSettings.bucket)

        this.opts = mergedSettings

        // init aws
        AWS.config.update(this.opts)

        this.s3 = new AWS.S3({
            computeChecksums: true
        })

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    getBucket(){ return this.opts.bucket }
    getRegion(){ return this.opts.region }
    
    getUrl(key){ 
        key = key.replace(/^\//, '');
        return `${this.opts.baseUrl}/${key}` 
    }

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
     * @see https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
     * @param {*} directoryKey 
     * @returns 
     */
    async list(directoryKey) {

        return new Promise((resolve, reject) => {     

            var params = {
                //Delimiter: '/',
                //EncodingType: 'url',
                //Marker: 'STRING_VALUE',
                //MaxKeys: 0,
                Prefix: directoryKey,
                Bucket: this.opts.bucket
            };

            this.s3.listObjectsV2(params, function(err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data.Contents);
                }
            });

        })   
 
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Check that a file exists
    * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property
    */
    async exists(key){

        return new Promise((resolve, reject) => {    

            var params = {
                Key: key,
                Bucket: this.opts.bucket
            };

            this.s3.headObject(params, function(err, data) {
                if (err) {
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });

        })   
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

        if (!contentType){
            contentType = 'text/plain';
        }

        return new Promise((resolve, reject) => {    

            // Remove any slashes at the start or end of string
            key = key.replace(/^\/|\/$/g, '');

            //Logger.debug("Uploading " + fileName + " to S3: " + key);
            
            var options = {
                partSize: 10 * 1024 * 1024,
                queueSize: 1
            };

            var params = {
                ACL: this.opts.acl,
                Bucket: this.opts.bucket,
                Key: key,
                Body: content,
                ContentType: contentType
            };

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
     * Upload a file to AWS, using multipart upload to handle large files.
     * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html
     *
     * @params {string} fileName The local file we want to upload (full path)
     * @params {string} buckey The s3 bucket
     * @params {string} key The s3 key (e.g. the path on S3)
     * @params {function} onDone Callback for when the file has been uploaded
     * @params {function} onProgress Callback called when there is a progress update
     */
    async upload(fileName, key) {

        return new Promise((resolve, reject) => {    
            
            // Remove any slashes at the start or end of string
            key = key.replace(/^\/|\/$/g, '');

            //Logger.debug("Uploading " + fileName + " to S3: " + key);

            var options = {
                partSize: 10 * 1024 * 1024,
                queueSize: 1
            };

            var body = fs.createReadStream(fileName);

            var params = {
                ACL: this.opts.acl,
                Bucket: this.opts.bucket,
                Key: key,
                Body: body,
                ContentType: mime.getType(key)
            };

            this.s3.upload(params, options)
                //.on('httpUploadProgress', function(prog) {
                //    let pc = Math.round(100 * (prog.loaded / prog.total))
                //    Logger.debug(`Progress: ${pc}%`);
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
    * Download a file from S3 to a temporary file locally
    *
    * @params {string} key The s3 key (e.g. the path on S3)
    * @params {function} onDone Callback for when the file has been download,
    */
    async download(key){

        // Remove any slashes at the start or end of string
        key = key.replace(/^\/|\/$/g, '');

        return new Promise((resolve, reject) => {    

            // First get a safe temporary filename to use
            tmp.tmpName((err, filename)=>{

                if (err){
                    return reject(err);
                }

                try {

                    //var stream = fs.createWriteStream(fileName, { flags: 'w', encoding: null, mode: 0666 });
                    var stream = fs.createWriteStream(filename);

                    this.s3.getObject({ Bucket: this.opts.bucket, Key: key })
                        .on('httpData', function(chunk) {
                            stream.write(chunk);
                        })
                        .on('complete', function() {
                            stream.end();
                            return resolve(filename);
                        })
                        .on('error', function(err){
                            Logger.error(err);
                            return reject(err);
                        })
                        .send();
                }
                catch(err){
                    Logger.error(err);
                    reject(err);
                }

            });

        }) 

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Download a file from S3 to a local file
    *
    * @params {string} key The s3 key (e.g. the path on S3)
    * @params {string} filename The filename
    */
    async downloadToFile(key, filename){

        // Remove any slashes at the start or end of string
        key = key.replace(/^\/|\/$/g, '');

        return new Promise(async (resolve, reject) => {    

            try {

                //var stream = fs.createWriteStream(fileName, { flags: 'w', encoding: null, mode: 0666 });
                var writeableStream = fs.createWriteStream(filename);
                var bytesLoaded = 0

                let headObjectData = await this.s3.headObject({ Bucket: this.opts.bucket, Key: key }).promise()
                let totalBytes = numeral(headObjectData.ContentLength).value()

                var bar = new ProgressBar('  Downloading [:bar] :rate/bps :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: totalBytes
                });

                this.s3
                    .getObject({ Bucket: this.opts.bucket, Key: key })
                    .createReadStream()
                    .on('httpHeaders', function(status, headers, response) {
                        Logger.warn(headers)
                        //totalBytes = parseInt(headers['content-length']);
                    })
                    .on('httpDownloadProgress', function(progress) {
                        Logger.warn("Progress:", progress);
                    })
                    .on('httpUploadProgress', function(progress) {
                        Logger.warn("Progress:", progress);
                    })                    
                    .on('error', (err)=>{
                        Logger.error(err)
                        writeableStream.end()
                        return reject(err)
                    })                 
                    .on('data', (chunk)=>{
                        bar.tick(chunk.length)
                        //writeableStream.write(data)
                        //bytesLoaded += chunk.length;
                        //let pc = Math.round(100 * bytesLoaded / totalBytes)
                        //Logger.debug(`Progress: ${pc}`)
                    })
                    .on('end', ()=>{
                        return resolve(filename)
                    })                                       
                    .pipe(writeableStream)
                                        
            }
            catch(err){
                Logger.error(err);
                reject(err);
            }

        }) 

    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Get a file
    * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    */
    async get(key) {
        return new Promise((resolve, reject) => {   
            this.s3.getObject({ Bucket: this.opts.bucket, Key: key }, (err, data)=>{
                if (err){
                    return reject(err);
                }
                let objectData = data.Body.toString('utf-8');
                resolve(objectData);
            });
        })
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Delete a file on S3
     */
    async delete(key) {

        return new Promise((resolve, reject) => {  
            var config = {
                Bucket: this.opts.bucket,
                Key: key
            };

            this.s3.deleteObject(config, (err, response)=>{
                if (err){
                    return reject(err)
                }
                resolve(response)
            });
        })

    }

    /**
     * Delete all items from s3
     * @param {object} items An object, with at minimum a Key field (i.e. the outout of a list)
     * @returns 
     */
    async deleteAll(items) {

        // Remove anything from the items list that isn't a Key or VersionId
        let cleaned = _.map(items, (item)=>{
            return {
                Key: item.Key,
                VersionId: item.VersionId
            }
        });

        return new Promise((resolve, reject) => {  
            var config = {
                Bucket: this.opts.bucket,
                Delete: {
                    
                    Objects: cleaned
                }
            };
            this.s3.deleteObjects(config, (err, response)=>{
                if (err){
                    return reject(err)
                }
                resolve(response)
            });
        })

    }    

};

module.exports = AmazonHelper;

