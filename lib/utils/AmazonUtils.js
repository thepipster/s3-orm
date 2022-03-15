"use strict";

const Logger = require('./logger.js')
const AWS = require('aws-sdk');
const mime = require('mime');
const fs = require('fs');
const tmp = require('tmp');

const EXPIRES_TIME = 43200; // 12 hours

/**
 * Class to simplify working with Amazon services
 */
var AmazonUtils = {

    // ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Get a signed URL to a resource on S3
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
     */
    getSignedUrl: function(bucket, key, callback) {
        var s3 = AmazonUtils.__getS3Instance();
        var params = {
            Bucket: bucket,
            Expires: EXPIRES_TIME,
            Key: key
        };
        s3.getSignedUrl('getObject', {Bucket: bucket, Key: key}, callback);
    },

    // ///////////////////////////////////////////////////////////////////////////////////////////

    list: function(bucket, directoryKey, callback) {
        var s3 = AmazonUtils.__getS3Instance();
        var params = {
            //Delimiter: '/',
            //EncodingType: 'url',
            //Marker: 'STRING_VALUE',
            //MaxKeys: 0,
            Prefix: directoryKey,
            Bucket: bucket
        };
        s3.listObjects(params, function(err, data) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, data.Contents);
            }
        });
    },

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Download a file from S3 to a temporary file locally
    *
    * @params {string} buckey The s3 bucket
    * @params {string} key The s3 key (e.g. the path on S3)
    * @params {function} onDone Callback for when the file has been download,
    */
    download: function(bucket, key, onDone){

        // First get a safe temporary filename to use
		tmp.tmpName(function(err, tempFilename) {

			if (err){
			    return onDone(err);
			}

            AmazonUtils.downloadToFile(bucket, key, tempFilename, onDone);

		});

    },

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Download a file from S3 to a local file
    *
    * @params {string} buckey The s3 bucket
    * @params {string} key The s3 key (e.g. the path on S3)
    * @params {string} filename The filename
    * @params {function} onDone Callback for when the file has been download,
    */
    downloadToFile: function(bucket, key, filename, onDone){

        try {

            var s3 = AmazonUtils.__getS3Instance();
            //var stream = fs.createWriteStream(fileName, { flags: 'w', encoding: null, mode: 0666 });
            var stream = fs.createWriteStream(filename);

            s3.getObject({ Bucket: bucket, Key: key })
                .on('httpData', function(chunk) {
                    stream.write(chunk);
                })
                .on('complete', function() {
                    stream.end();
                    onDone(null, filename);
                })
                .on('error', function(err){
                    Logger.error(err);
                    onDone(err);
                })
                .send();
        }
        catch(err){
            Logger.error(err);
            onDone(err);
        }

    },

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Get a file
    * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    */
    get: function(bucket, key, callback) {
        var s3 = AmazonUtils.__getS3Instance();
        s3.getObject({ Bucket: bucket, Key: key }, function(err, data){
            if (err){
                return callback(err);
            }
            let objectData = data.Body.toString('utf-8');
            callback(null, objectData);
        });
    },

    // ///////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Dete a file
    * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    */
    delete: function(bucket, key, callback) {
        var s3 = AmazonUtils.__getS3Instance();
        s3.deleteObject({ Bucket: bucket, Key: key }, function(err, data){
            if (err){
                return callback(err);
            }
            callback(null);
        });
    },

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
    upload: function(fileName, bucket, key, onDone, onProgress) {

        // Remove any slashes at the start or end of string
        key = key.replace(/^\/|\/$/g, '');

        //Logger.debug("Uploading " + fileName + " to S3: " + key);


        var s3 = AmazonUtils.__getS3Instance();

        var options = {
            partSize: 10 * 1024 * 1024,
            queueSize: 1
        };

        var body = fs.createReadStream(fileName);

        var params = {
            ACL: 'public-read', //'public-read', 'private'
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: mime.getType(key)
        };

        s3.upload(params, options)
            .on('httpUploadProgress', function(progress) {
                Logger.debug("Progress:", progress);
                if (onProgress){
                    onProgress(progress);
                }
            })
            .send(function(err, data) {
                if (err){
                    Logger.error(err);
                }
                //Logger.debug("File uploaded:", data);
                onDone(err, key);
            });

    },

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
    uploadString: function(content, bucket, key, onDone, onProgress) {

        // Remove any slashes at the start or end of string
        key = key.replace(/^\/|\/$/g, '');

        //Logger.debug("Uploading " + fileName + " to S3: " + key);
        
        var s3 = AmazonUtils.__getS3Instance();

        var options = {
            partSize: 10 * 1024 * 1024,
            queueSize: 1
        };

        var params = {
            ACL: 'public-read', //'public-read', 'private'
            Bucket: bucket,
            Key: key,
            Body: content,
            ContentType: mime.getType(key)
        };

        s3.upload(params, options)
            .on('httpUploadProgress', function(progress) {
                Logger.debug("Progress:", progress);
                if (onProgress){
                    onProgress(progress);
                }
            })
            .send(function(err, data) {
                if (err){
                    Logger.error(err);
                }
                //Logger.debug("File uploaded:", data);
                onDone(err, key);
            });

    },

    // ///////////////////////////////////////////////////////////////////////////////////////////

    __getS3Instance : function(){

        var opts = {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_ACCESS_SECRET
        };

        // init aws
        AWS.config.update(opts);

        var s3 = new AWS.S3({
            computeChecksums: true
        });

        return s3;
    }

};

if(require.main === module) {

}
else {
    export default  AmazonUtils;
}
