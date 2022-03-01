const BaseModel = require('./BaseModel.js')
const BaseModelHelper = require('./utils/BaseModelHelper.js')
const Logger = require('../../utils/logger')
class User extends BaseModel {
    
    constructor(data){
        super(data)        
    }

    static _name(){
        return 'User'
    }

    static _model(){
        return {
            uid: { type: 'string', index: true, unique:true}, 
            username: { type: 'string', index: true},
            lastIp: { type: 'string', index: true},
            displayName: { type: 'string', index: true, unique:true}, 
            avatar: { type: 'string' },
            paypalEmail: { type: 'string'},
            // Flag true if the user has applied to be a contestant
            hasAppliedContestant: { type: 'boolean', defaultValue: false }, 
            // If the display name or avatar is flagged as profane
            isSuspectedCheater: { type: 'boolean', defaultValue: false },    
            // If the display name or avatar is flagged as profane
            isProfane: { type: 'boolean', defaultValue: false },    
            // Flags a user as a member of the team
            isEmployee: { type: 'boolean', defaultValue: false },    
            // Flags user as a sim bot  
            isBot: { type: 'boolean', defaultValue: false },
            // If this user has used a referral code, we store it here (they get to do this once)
            referralCode: { type: 'string' },  
            // If other players have used this player as a reference, then store here
            acceptedReferralUserIds: {type: 'array'}, 
            password: { type: 'string' },
            salt: { type: 'string' },              
            role: { type: 'string', enum: ['admin', 'player', 'editor', 'factContributor' ,'bot'], defaultValue: 'player' },
            status: { type: 'string', enum: ['active', 'suspended'], defaultValue: 'active' },
            formToken: { type: 'string', index: true},
            formTokenDate: { type: 'date' },
            ssnHash: { type: 'string' },              
            completedW9: { type: 'boolean', defaultValue: false, index: true },
            completedW8: { type: 'boolean', defaultValue: false, index: true },
            // A flag for each user to show they signed a release form for being on the show
            hasSignedReleaseForm: { type:  'boolean', defaultValue: false },
            hasSignedReleaseFormDate: { type: 'date' },
            gamesPlayed: { type: 'integer', defaultValue:0 },
            // Winnings, all time
            totalWinnings: { type: 'integer', defaultValue: 0 },
            // Total cash paid out (i.e. collected winnings)
            cashPaidout: { type: 'integer', defaultValue: 0  },
            // Cash not paid out (i.e. uncollected winnings)
            cash: { type: 'integer', defaultValue:0 },
            gems: { type: 'integer', defaultValue:0 },
            lastLogin: { type: 'date' }
        }
    } 

    static async addCash(userId, amount){
        let user = await this.load(userId)
        if (!user){
            throw Error(`Could not find user with uid of ${userId}`)
        }
        user.cash += amount
        return await user.save()
    }

    static async addGems(userId, amount){        
        let user = await this.load(userId)
        if (!user){
            throw Error(`Could not find user with uid of ${userId}`)
        }
        user.gems += amount
        return await user.save()
    }

    static async checkUsernameExists(username){
        let key = `${BaseModelHelper.getKey(this._name(), 'unique')}:displayName:${username.toLowerCase()}`
        let exists = await BaseModel._redisCommand('exists', key)

        Logger.debug(`checkUsernameExists: key = ${key}, exists = ${exists}`)
        if (exists) {
            return true
        }
        else {
            return false
        }
    }


    /**
     * Get a list of user id's of users in this game
     * @param {*} callback 
     */
    static async getUserIds(){
        return await this.distinct('uid')
    }

    /**
     * Load a User from the uid given by firebase
     * @param {string} uid The firebase uid
     */
    static async load(uid){ 
        return await this.findOne({uid:uid})
    }

}

User.register()

if(require.main === module) {

    const Logger = require('../../utils/logger')
    const Settings = require('../../Settings')
    Logger.setLevel('debug')
    
    async function doTest(){

        let uid = 'EGogvMeMS6eq29opbte9FiDCko32'
        let name = 'MIKE@arsenicsoup.com'
        let ip = '192.210.160.130'

        let user2 = await User.findOne({lastIp:ip})

        Logger.error(user2)

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
    module.exports = User
}

