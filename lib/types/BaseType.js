import _ from "lodash";
import Logger from "../utils/Logger.js";

export default  class BaseType {
    
    constructor(name, isNumeric){
        this.name = name;
        this.isNumeric = isNumeric;
        this.encodedMarker = '';
    }
    
    mock(){
        return null;
    }
    

    parse(val){
        if (typeof val != 'string'){
            throw new Error(`Can not parse a non-string value!`);
        }
        if  (_.isNull(val) || _.isUndefined(val) || val == ''){
            return null;
        }
        //val = this._uncleanString(val);
        if (this.parseExtended){
            val = this.parseExtended(val);  
        }
        return val;
    }

    encode(val){
                
        //if (typeof val == 'string' && this._isEncoded(val)){
        //    return val;
        //}

        if (this.encodeExtended){
            val = this.encodeExtended(val);
        }
        return this._cleanString(val); 
    }

    /**
     * Check to see if the data is already encoded
     * @param {*} str 
     */
    //_isEncoded(str){
    //    if (str.slice(0, this.encodedMarker.length) == this.encodedMarker){
    //        return true;
    //    }
    //    return false;
    //}

    /**
     * Remove any generic markers, such as encoded marker
     * @param {*} str 
     */
    _uncleanString(str){
        return str.slice(this.encodedMarker.length);
    }

    /**
     * Deal with null or undefined values that got encoded and mark as encoded
     * to avoid double encoding bugs
     * @param {*} str 
     * @returns 
     */
    _cleanString(str){
        if (!str || str == 'null' || str == 'undefined'){
            return '';
        }
        return str;
    }
/*
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },


    */
}