
import base64url from "base64url";
import Logger from "../utils/Logger";

export class EngineHelpers {
    
    static rootPath: string = "s3orm/";

    // ///////////////////////////////////////////////////////////////////////////////////////

    static encode(str){
        if (typeof str != 'string'){
            Logger.error(`BaseS3Engine._encode() - ${str} is not a string, it is a ${typeof str}`);
            throw new Error(`${str} is not a string, it is a ${typeof str}`);
        }
        return base64url(str);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    static decode(hash){
        if (typeof hash != 'string'){
            Logger.error(`BaseS3Engine._decode() - ${hash} is not a string, it is a ${typeof hash}`);
            throw new Error(`${hash} is not a string, it is a ${typeof hash}`);
        }        
        return base64url.decode(hash);
    }
       
	// ///////////////////////////////////////////////////////////////////////////////////////

    static getPath(prefix: string, setName?: string, val?: string){        
        return this.getKey(prefix, setName, val) + '/';  
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    static getKey(prefix: string, setName?: string, val?: string){        

        if (!setName){
            return `${this.rootPath}${prefix}`;
        }

        if (!val){
            return `${this.rootPath}${prefix}/${setName}`;
        }

        return `${this.rootPath}${prefix}/${setName}/${this.encode(val+'')}`;
    }

	// ///////////////////////////////////////////////////////////////////////////////////////

    static getKeyWithId(prefix, setName, val, id){        
        //const pad = "0000000";
        //const idStr = (pad+id).slice(-pad.length);    
        const idStr = id+'';        
        return `${this.rootPath}${prefix}/${setName}/${this.encode(val+'')}###${idStr}`;
    }

	// ///////////////////////////////////////////////////////////////////////////////////////
    
    static getKeyWithScore(prefix, setName, val, score){        
        //const pad = "0000000";
        //const scoreStr = (pad+score).slice(-pad.length);            
        const scoreStr = score+'';        
        return `${this.rootPath}${prefix}/${setName}/${scoreStr}###${this.encode(val+'')}`;    
    }

}