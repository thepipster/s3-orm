const uuidv4 = require('uuid/v4')
const Chance = require('chance');
const _ = require('lodash')
const Logger = require('./utils/logger')

const DataTypes = {

    Id: {
        name: 'id',
        isNumeric: true,
        mock(){ return _.random(1,10000)},
        parse(val){ return val },
        encode(val){ return val }        
    },
    Uuid: {
        name: 'uuid',
        isNumeric: false,
        mock(){ return DataTypes.generateToken()},
        parse(val){ return val },
        encode(val){ return val }
    },
    Json: {
        name: 'json',
        isNumeric: false,
        mock(){ 
            return {
                a: chance.integer({ min: -200, max: 200 }),
                b: chance.name(),
                c: chance.d100(),
                d: chance.floating({ min: 0, max: 1000})
            }   
        },
        parse(val){ 
            if (val && typeof val == 'string'){
                try {
                    return JSON.parse(val)
                }
                catch(err){
                    return null
                }
            } 
            return val            
        },
        encode(val){
            return JSON.stringify(val);
        }
    },
    Float: {
        name: 'float',
        isNumeric: true,
        mock(){ return chance.floating({ min: 0, max: 1000})},
        parse(val){ 
            let flno = parseFloat(val)
            if (_.isFinite(flno)){
                return flno
            }
            return null            
        },
        encode(val){ return val }
    },
    Integer: {
        name: 'integer',
        isNumeric: true,
        mock(){ return chance.integer({ min: -200, max: 200 })},
        parse(val){ 
            let no = parseInt(val)
            if (_.isFinite(no)){
                return no
            }
            return null
        },
        encode(val){ return val }
    },
    String: {
        name: 'string',
        isNumeric: false,
        mock(){ return chance.word()},
        parse(val){ return val },
        encode(val){ return val }
    },
    Boolean: {
        name: 'boolean',
        isNumeric: false,
        mock(){ return chance.bool()},
        parse(val){ 
            if (val == 1 || val == '1'){
                return true
            }
            return false
        },
        encode(val){return (val) ? 1 : 0}
    },
    Array: {
        name: 'array',
        isNumeric: false,
        mock(){ return chance.n(chance.email, 5)},
        parse(val){ return val },
        encode(val){ return val }
    },
    Date: {
        name: 'date',
        isNumeric: false,
        mock(){ return chance.date()},
        parse(val){ 
            let epoch = parseInt(val)
            if (_.isFinite(epoch)){
                return new Date(epoch)
            }
            return null            
        },
        encode(val){ 
            if (!val){
                return 0
            }
            return (new Date(val)).getTime();            
        }
    },

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

    }

}

// Default, dexport as a object
module.exports = DataTypes;

// Names exports
module.exports = {
    Id: DataTypes.Id,
    Uuid: DataTypes.Uuid,
    Json: DataTypes.Json,
    Float: DataTypes.Float,
    Number: DataTypes.Float,
    Integer: DataTypes.Integer,
    String: DataTypes.String,
    Boolean: DataTypes.Boolean,
    Array: DataTypes.Array,
    Date: DataTypes.Date
}   
 