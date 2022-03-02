
const Logger = require("./utils/Logger");
const _ = require("lodash");
const axios = require('axios');
const xml2js = require('xml2js');

/**
 * Interactions with AWS S3 from the browser
 */
class ClientAWS {

    constructor(rootUrl){
        this.rootUrl = rootUrl;
    }
 
	// ///////////////////////////////////////////////////////////////////////////////////////

    async get(key){
        try {
            let url = `${this.rootUrl}/${key}`;
            const res = await axios.get(url);
            return res.data;
        }
        catch(err){
            if (err.response && err.response.data){
                let parsed = await xml2js.parseStringPromise(err.response.data);
                Logger.error(`Error calling LIST ${key}, message = ${parsed.Error.Message[0]}`);    
            }
            else {
                Logger.error(err);
            }
        }        
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async exists(key){
        try {
            let url = `${this.rootUrl}/${key}`;
            await axios.head(url);
            return true;
        } 
        catch (error) {
            if (error.response.status >= 400) {
                return false;
            }
        }        
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    async list(path, keysOnly){
        try {
            let url = `${this.rootUrl}?prefix=${path}`;
            //Logger.debug(`Getting from path ${url}`);
            const res = await axios.get(url);
            let parsed = await xml2js.parseStringPromise(res.data);
            if (keysOnly){
                return _.map(parsed.ListBucketResult.Contents, (item)=>{
                    return item.Key[0];
                });    
            }
            else {
                let items = [];
                for (let i=0; i<parsed.ListBucketResult.Contents.length; i+=1){
                    items.push({
                        Key: parsed.ListBucketResult.Contents[i].Key[0],
                        LastModified: parsed.ListBucketResult.Contents[i].LastModified[0],
                        ETag: parsed.ListBucketResult.Contents[i].ETag[0],
                        Size: parsed.ListBucketResult.Contents[i].Size[0],
                        StorageClass: parsed.ListBucketResult.Contents[i].StorageClass[0]
                    })
                }
                return items;
            }

        }
        catch(err){
            if (err.response && err.response.data){
                let parsed = await xml2js.parseStringPromise(err.response.data);
                Logger.error(`Error calling LIST ${path}, message = ${parsed.Error.Message[0]}`);    
            }
            else {
                Logger.error(err);
            }
        }
    }    
}

module.exports = ClientAWS;