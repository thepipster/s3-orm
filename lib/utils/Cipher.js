"use strict";
const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const Logger = require('./Logger');

var Cipher = {

    /**
     * Encode a object, by using JSON.stringify
     * @param {object} val The value to encode, can be a string or an object
     */
    encodeObject(obj) {
        if (!obj){
            return null;
        }        
        let valStr = JSON.stringify(obj);
        return Cipher.encode(valStr);
    },

    decodeObject(val) {
        if (!val){
            return null;
        }        
        let valStr = Cipher.decode(val);
        try {
            return JSON.parse(valStr);
        }
        catch(err){
            throw new Error(`Could not decode data`);
        }
    },

    /**
     * Encode a string
     * @param {string} plaintext A string to encode
     */
    encode(plaintext) {
        if (!plaintext){
            return null;
        }
        try {
            return CryptoJS.AES.encrypt(plaintext, process.env.DATABASE_ENCRYPT_KEY).toString();
        }
        catch(err){
            Logger.error(typeof plaintext, plaintext);
            Logger.error(err);
        }
    },

    decode(val) { 
        if (!val){
            return null;
        }
        try {
            var bytes = CryptoJS.AES.decrypt(val, process.env.DATABASE_ENCRYPT_KEY);
            return bytes.toString(CryptoJS.enc.Utf8);    
        }
        catch(err){
            return null;
        }
    },


    checksum(dataString) {

        return crypto
            .createHash('sha256')
            .update(dataString, 'utf8')
            .digest('hex')
  
    }

}

if (require.main === module) {
    
    const Logger = require('./Logger');

    let test = 'My dog is a crazy dog';

    let encoded = Cipher.encode(test);

    Logger.warn(encoded);

    Logger.debug('checksum = ', Cipher.checksum(test));
    
    Logger.debug(Cipher.decode(encoded));

}
else {
    module.exports = Cipher;
}