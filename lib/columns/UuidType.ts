import uuidv4 from 'uuid/v4';
import BaseType from "./BaseType";

class UuidType extends BaseType {
    
    constructor(){
        super('uuid', false);
    }    
    
    mock(){ 
        return this.generateToken();
    }
    
    static encode(val: any): string { 
    }

    static decode(val: string) {    
    }

    /**
     * Generate a token for use as a secret key, nonce etc.
     * @param length (optional) specify length, defaults to 24;
     * @return {string}
     */
     generateToken(length=24) {

        let token = uuidv4().replace(/-/g,'')

        while (token.length < length){
            token += uuidv4().replace(/-/g,'')
        }

        return token.substr(0,length)

    }            
}

export default  new UuidType();