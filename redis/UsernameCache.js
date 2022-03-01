/**
 * @author: mike@arsenicsoup.com
 */
const Logger = require('../../utils/logger')
const Settings = require('../../Settings')

var UsernameCache = {

    _prefix(){
        return 'ucdn:'
    },

    _getByKey(key, callback){
        if (callback){
            Settings.redisClient.get(key, callback)
        }        
        else {
            return new Promise((resolve, reject) => {            
                Settings.redisClient.get(key, (err, obj)=>{
                    if (err){
                        return reject(err)
                    }
                    return resolve(obj)
                })
            })            
        }
    },

    _setByKey(key, val, callback){
        if (callback){
             Settings.redisClient.set(key, val, callback)
        }        
        else {
            return new Promise((resolve, reject) => {            
                Settings.redisClient.set(key, val, (err, obj)=>{
                    if (err){
                        return reject(err)
                    }
                    return resolve(obj)
                })
            })            
        }
    },

    remove(username, callback){
        let key = UsernameCache._prefix()+username
        Settings.redisClient.del(key, callback)
    },

    /**
     * Add a username to the cache
     * @param {*} username 
     * @param {*} uid 
     * @param {*} callback 
     */
    add(username, uid, callback){
        if (!username){
            return
        }
        let key = UsernameCache._prefix()+username.toLowerCase()
        return UsernameCache._setByKey(key, uid, callback)
    },

    /**
     * Get a username from the cache.
     * NOTE: this will ignore case
     * @param {*} username 
     * @param {*} callback 
     */
    get(username, callback){
        if (!username){
            return null
        }
        Logger.debug(`GET username, ${username}`)
        let key = UsernameCache._prefix()+username.toLowerCase()
        return UsernameCache._getByKey(key, callback)
    }   
    
}

//UsernameCache.register()

module.exports = UsernameCache