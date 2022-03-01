const BaseModel = require('./BaseModel')

/**
 * Class to represent a session in the redis database.
 * Sessions hava a TTL, and will auto-delete after SESSION_TIME
 */
class Session extends BaseModel {
    
    constructor(data) {  
        super(data) 
    }

    static _name(){
        return 'Sesh'
    }

    static _model(){
        return {
            uid: {type:'string', index:true},
            lastIp: {type:'string'},
            role: {type:'string', defaultValue:'player'},
            username: {type:'string', defaultValue:''},
            startEpoch: {type:'number', defaultValue: ()=>{return Date.now()}},
            expiresEpoch: {type:'number', defaultValue: ()=>{Date.now()+process.env.SESSION_TIME}},
            token: {type:'string', index:true}
        }
    }

    static _prepareFirebaseToken(token){
        
        if (!token){
            throw Error("Token is null")
        }

        /*
bmFtZSI6IndvdzIiLCJhdWQiOiJwb3BjdWx0dXJlLWxpdmUiLCJhdXRoX3RpbWUiOjE1MjUxMTMzMjgsInVzZXJfaWQiOiJUVktST1M0dkduZHBxWGN3VjBRZjlzV0E5TzYyIiwic3ViIjoiVFZLUk9TNHZHbmRwcVhjd1YwUWY5c1dBOU82MiIsImlhdCI6MTUyNTExNDY5OSwiZXhwIjoxNTI1MTE4Mjk5LCJwaG9uZV9udW1iZXIiOiIrMTcwMzI5ODExMDQiLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7InBob25lIjpbIisxNzAzMjk4MTEwNCJdfSwic2lnbl9pbl9wcm92aWRlciI6InBob25lIn19.Cir0Mc01RvAEe-ibulxfYwTT4I0XCJzpJoGf80VkC1yZQ_7_f4Nmb27Iq1PWsJM_bC9XcuxfByZWK4HkDQKkIQnzDu-oin7rLDHgI6pVl3P3xgCNoIX_UpIJtUkbnjxpgU8DZP6Hi4tbvzQ9pdTDnldGir-yq5YkNIT6nzOewM71T8_14c81nIdRlj92_xtwEI1EiuG2mY8qM9b3il0hmw0aEQEYbQPx5t2bN_2fHxSnKOMht3AsHcTZg0lADr0lwsoeAqMO1B7PPs25bhP-Aapvntpw0cg39p6QL0Ce1f6jlmJmI4UkfebPSao4cl4qMrj23b_Hec3aU9urI3eTdw
        */
        //let commonStrLength = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjMwNDZhMTU2MzczNjZiNGQ2NGQ5YTVhYmIzMzczMTgyYmE0ZDdjZmIifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcG9wY3VsdHVyZS1saXZlIiwi'.length
        let commonStrLength = 163
        return token.substring(commonStrLength)

        //req.token.substr(req.token.length - 25))

    }

    /**
     * Load a session from a session token
     * @param {string} uid The user id
     * @param {string} token The firebase idtoken
     * @param {function} callback Return a callback of form (err, user)
     */
    static async load(uid, token){
        return await this.findOne({uid: uid, token:token})
    }



}

Session.register()

if(require.main === module) {

    const Logger = require('../../utils/logger')
    const Settings = require('../../Settings')

    async function doTest(){

        let uid = 'EGogvMeMS6eq29opbte9FiDCko32'
        let token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE3ZTBmNDI1NjRlYjc0Y2FlNGZkNDhiZGE5ZjA0YmE2OTRmNDExNDQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcG9wY3VsdHVyZS1saXZlIiwiYXVkIjoicG9wY3VsdHVyZS1saXZlIiwiYXV0aF90aW1lIjoxNTM3Mzc0MTQzLCJ1c2VyX2lkIjoiRUdvZ3ZNZU1TNmVxMjlvcGJ0ZTlGaURDa28zMiIsInN1YiI6IkVHb2d2TWVNUzZlcTI5b3BidGU5RmlEQ2tvMzIiLCJpYXQiOjE1MzczNzQxNDMsImV4cCI6MTUzNzM3Nzc0MywiZW1haWwiOiJtaWtlQGFyc2VuaWNzb3VwLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJtaWtlQGFyc2VuaWNzb3VwLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.QQRpPEztk1MGvloEoY_AyNJ_uz7DcQ0ofhY9jYwGV5CgcPmienDtMG8oecbUHozB2HAIVf-umA3sdMWJgK6cdmkPovlTgF4WTK9fPykHN1SY0H-QrUIj2WohWkf0fSdABmc7lu8RIEg3gFKBYmYxhfIJr2nBYlnLue-uy5hmeAY4YHldHcQSHNR7mSjVhGNFMg80lN0HpVvoe6YXEEMPVm8islYlTnh6IAXm_gZP7xfwYu7O7qoi_MuxPwGE8wumqbiYPa5dCGy3a4Yi3USH6BcpGu8Mnw4CpQkQIeOoxpoZQI36cg-krCISO6STt2K9yBWc_ODo4Ji34rjfzE5goA'

        let sesh = await Session.findOne({uid:uid, token: token })
        Logger.debug('sesh = ', sesh)

    }

    Settings.redisClient.once("connect", async (err) => {

        doTest()
            .then()
            .catch(err=>{
                Logger.error(err)
            })

    })


}
else {
    module.exports = Session
}



