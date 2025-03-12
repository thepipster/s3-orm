
export interface BaseType {
    toString(val: any): string;
    fromString(val: string): any;
    mock(): any;
}

/*
export default class BaseType {
    
    name: string;
    isNumeric: boolean;
    encodedMarker: string;

    constructor(name, isNumeric){
        this.name = name;
        this.isNumeric = isNumeric;
        this.encodedMarker = '';
    }
    
    mock(){
        return null;
    }
    

     * Convert a data value to a string that can be saved to S3
     * @param val The value to convert
     * @returns 

    toString(val: any): string{
        if (typeof val != 'string'){
            throw new Error(`Can not parse a non-string value!`);
        }
        if  (isNull(val) || isUndefined(val) || val == ''){
            return null;
        }
        return val;
    }


     * Convert a string value to a data value, i.e. read from S3 and 
     * convert back to the correct data type
     * @param val The string value to convert
     * @returns 

    fromString<Type>(val: string): Type {                
        //if (typeof val == 'string' && this._isEncoded(val)){
        //    return val;
        //}
        return this._cleanString(val); 
    }


     * Check to see if the data is already encoded
     * @param {*} str 

    //_isEncoded(str){
    //    if (str.slice(0, this.encodedMarker.length) == this.encodedMarker){
    //        return true;
    //    }
    //    return false;
    //}


     * Remove any generic markers, such as encoded marker
     * @param {*} str 

    _uncleanString(str){
        return str.slice(this.encodedMarker.length);
    }


     * Deal with null or undefined values that got encoded and mark as encoded
     * to avoid double encoding bugs
     * @param {*} str 
     * @returns 

    _cleanString(str){
        if (!str || str == 'null' || str == 'undefined'){
            return '';
        }
        return str;
    }
}
*/