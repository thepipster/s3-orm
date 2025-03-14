import {isNull, isUndefined} from "lodash";
import Logger from "../utils/Logger";

export class BaseType {
    
    static mock(){
        return null;
    }
    
    static encode(val: any): string{   
        if (val === null || val === undefined) return '';
        return String(val);
    }

    static decode(val: any){         
        return val;
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
    //_uncleanString(str){
    //    return str.slice(this.encodedMarker.length);
    //}

    /**
     * Deal with null or undefined values that got encoded and mark as encoded
     * to avoid double encoding bugs
     * @param {*} str 
     * @returns 
     */
    //_cleanString(str){
    //    if (!str || str == 'null' || str == 'undefined'){
    //        return '';
    //    }
    //    return str;
    //}

}