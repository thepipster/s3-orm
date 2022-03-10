const uuidv4 = require('uuid/v4')
const BaseType = require('./BaseType');

class UuidType extends BaseType {
    
    constructor(){
        super('uuid', false);
    }    
    
    mock(){ 
        return this.generateToken();
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

module.exports = new UuidType();