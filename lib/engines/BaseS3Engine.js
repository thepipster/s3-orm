
const Logger = require("../utils/Logger");
const base64url = require('base64url');
const _ = require('lodash');

class BaseS3Engine {
    
    constructor(){

    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    _encode(str){
        if (typeof str != 'string'){
            Logger.error(`BaseS3Engine._encode() - ${str} is not a string, it is a ${typeof str}`);
            throw new Error(`${str} is not a string, it is a ${typeof str}`);
        }
        return base64url(str);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    _decode(hash){
        if (typeof hash != 'string'){
            Logger.error(`BaseS3Engine._decode() - ${hash} is not a string, it is a ${typeof hash}`);
            throw new Error(`${hash} is not a string, it is a ${typeof hash}`);
        }        
        return base64url.decode(hash);
    }
       
	// ///////////////////////////////////////////////////////////////////////////////////////

    __getPath(prefix, setName, val){        
        return this.__getKey(prefix, setName, val) + '/';  
    }

    __getKey(prefix, setName, val){        

        if (!setName){
            return `${this.rootPath}${prefix}`;
        }

        if (!val){
            return `${this.rootPath}${prefix}/${setName}`;
        }

        return `${this.rootPath}${prefix}/${setName}/${this._encode(val+'')}`;
    }

    __getKeyWithId(prefix, setName, val, id){        
        //const pad = "0000000";
        //const idStr = (pad+id).slice(-pad.length);    
        const idStr = id+'';        
        return `${this.rootPath}${prefix}/${setName}/${this._encode(val+'')}###${idStr}`;
    }

    __getKeyWithScore(prefix, setName, val, score){        
        //const pad = "0000000";
        //const scoreStr = (pad+score).slice(-pad.length);            
        const scoreStr = score+'';        
        return `${this.rootPath}${prefix}/${setName}/${scoreStr}###${this._encode(val+'')}`;    
    }

}


module.exports = BaseS3Engine;