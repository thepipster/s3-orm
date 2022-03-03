const uuidv4 = require('uuid/v4')
const Chance = require('chance');
const _ = require('lodash')
const Logger = require('../../../utils/logger')

const BaseModelHelper = {

    prefix: 'pcl2',
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

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

    },

    /**
     * Generate random sample data for this class
     * @param {object} model The model 
     */
    generateMock(model){

        let chance = new Chance()
        let testInfo = {}

        for (let key in model){

            if (key == 'id'){
                testInfo[key] = BaseModelHelper.generateToken(24)
            }
            else if (key.search('uuid') !== -1){
                testInfo[key] = chance.guid()
            }                         
            else if (key.search('uid') !== -1){
                testInfo[key] = BaseModelHelper.generateToken(24)
            }  
            else if (key.search('Id') !== -1){
                testInfo[key] = chance.guid()
            }
            else if (key == 'ip' || key == 'lastIp'){
                testInfo[key] = chance.ip()
            }
            else if (key == 'avatar'){
                testInfo[key] = chance.avatar({fileExtension: 'png', protocol: 'https'})
            }
            else if (key == 'username'){
                testInfo[key] = chance.name()
            }
            else if (key == 'token'){
                testInfo[key] = BaseModelHelper.generateToken(48)
            }     
            else if (key == 'status'){
                testInfo[key] = 'active'
            }                            
            else if (key == 'role'){
                testInfo[key] = 'player'
            }            
            else {
                switch(model[key].type){

                    case 'string':
                        testInfo[key] = chance.word(); 
                        break;

                    case 'float': 
                        testInfo[key] = chance.floating({ min: 0, max: 1000}); 
                        break;

                    case 'object': 
                    case 'json': 
                        testInfo[key] = {
                            a: chance.integer({ min: -200, max: 200 }),
                            b: chance.name(),
                            c: chance.d100(),
                            d: chance.floating({ min: 0, max: 1000})
                        }                    
                        break;

                    case 'number': 
                    case 'integer': 
                        testInfo[key] = chance.integer({ min: -200, max: 200 }); break;

                    case 'array': 
                        testInfo[key] = chance.n(chance.email, 5);
                        break;

                    case 'boolean': 
                        testInfo[key] = chance.bool(); 
                        break;

                    case 'timestamp': 
                    case 'date': 
                        testInfo[key] = chance.date(); 
                        break;

                    default: throw new Error(`${model[key].type} is a unsupported definition type`)
                }
            }

        }

        // For ease, generate id
        testInfo.id = BaseModelHelper.generateToken(24)
        
        return testInfo
    },

    /**
     * Get the underlying key in redis
     * @see https://redis.io/topics/cluster-spec#keys-distribution-model for notes on slots and cluster keys
     * @param {*} type The type to get; 'hash' for the hash object, 'index' for an index, 'meta' for meta info
     */
    getKey(name, type, id){
        if (id){
            return `${BaseModelHelper.prefix}:{${name}:${type}:${id}}`
        }
        return `${BaseModelHelper.prefix}:{${name}:${type}}`
    },

    isNumericType(type){
        switch (type){
            case 'integer':
            case 'number':
            case 'float':
            case 'date':
            case 'timestamp':
                return true;
                break;
        }
        return false
    },

    parseBoolen(val){
        if (val == 1 || val == '1'){
            return true
        }
        return false
    },

    writeItem(definition, val){
        
        if (!definition){
            throw Error(`No definition, val = ${val}`)
        }

        if (_.isUndefined(val)){
            return ''
        }

        if (_.isNull(val)){
            return ''
        }

        switch (definition.type){

            case 'json':
            case 'array':
            case 'object':            
                // Could use https://github.com/hughsk/flat instead
                // see https://medium.com/@stockholmux/store-javascript-objects-in-redis-with-node-js-the-right-way-1e2e89dbbf64           
                return JSON.stringify(val)
            
            case 'timestamp':
            case 'date':
                if (!val){
                    return 0
                }
                return (new Date(val)).getTime()

            case 'float':
            case 'integer':
            case 'number':
                return val

            case 'boolean':
                return (val) ? 1 : 0

            case 'string':
                return _.toString(val)

            default:
                return val
        }

    },

    parseItem(definition, val){

        if (_.isUndefined(definition)){
            throw Error(`No definition, val = ${val}`)
        }

        try {
        
            if (_.isUndefined(val)){
                return null
            }

            switch (definition.type){

                case 'array':
                case 'object':                           
                case 'json':       
                    //Logger.error(`Parsing ${typeof val} [${val}]`, _.isEmpty(val), !!val)                   
                    if (val && typeof val == 'string'){
                        try {
                            return JSON.parse(val)
                        }
                        catch(err){
                            return null
                        }
                    } 
                    return val
                
                case 'timestamp':
                case 'date':
                    let epoch = parseInt(val)
                    if (_.isFinite(epoch)){
                        return new Date(epoch)
                    }
                    return null

                case 'integer':
                    let no = parseInt(val)
                    if (_.isFinite(no)){
                        return no
                    }
                    return null

                case 'float':
                case 'number':
                    let flno = parseFloat(val)
                    if (_.isFinite(flno)){
                        return flno
                    }
                    return null

                case 'boolean':
                    return BaseModelHelper.parseBoolen(val)

                case 'string':
                    return val

                default:
                    return val
            }
        }   
        catch(err){
            Logger.error(err)
            Logger.error('definition = ', definition)
            Logger.error(`val = ${val} (type = ${typeof val})`)
            return null
        }

    }

}

module.exports = BaseModelHelper