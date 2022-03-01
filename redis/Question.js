const Logger = require('../../utils/logger')
const BaseModel = require('./BaseModel')

class Question extends BaseModel {
    
    /**
     * Instantiate a Question
     * @param {Object} data The question data, of form;
     * {
     *     id: 1,
     *     order: 0,
     *     gameId: 1,
     *     text: "Last year, an online contest....",
     *     choices: ["Canada", "Sweden", "England", "Australia"],
     *     answer: 2, 
     *     difficulty: 1
     * }
     */    
    constructor(data) {
        super(data) 
    }

    static _name(){
        return 'Question'
    }

    static _model(){
        return {
            uuid: {type:'string', index:true},
            gameId: {type:'string', index:true},
            order: {type:'integer'},
            difficulty: {type:'integer'},
            text: {type:'string'},
            // -1 if not open yet, 1 if open and 0 if closed (but was open)
            state: {type:'integer', defaultValue:-1, index:true},
            startTime: {type:'integer', defaultValue:null},
            endTime: {type:'integer', defaultValue:null},
            answer: {type: 'string'},
            answerSecondary: {type: 'string'},
            //{key: 'votes', type: 'integer'},
            choices: {type: 'json'}
        }
    }

    /**
     * Mark a question as open, i.e. live and can be voted on
     * @param {number} questionId 
     * @param {number} window The question window, in milliseconds (how long the question is open for)
     */
    static async setOpen(gameId, questionId, window){        
        let quest = await this.load(gameId, questionId)
        quest.state = 1
        quest.startTime = Date.now()
        quest.endTime = (Date.now()+parseInt(window))
        return await quest.save()
    }

    /**
     * Fast check if a question is still open
     * @param {number} questionId The question id
     * @param {function} callback Returns -1 if not open yet, 1 if open and 0 if closed (but was open)
     */
    static async isOpen(gameId, questionId){        
        let quest = await this.load(gameId, questionId)
        return (quest && quest.state == 1)
    }

    /**
     * Load a Question using the question id
     * @param {string} questionId The question id (id)
     * @param {function} callback Return a callback of form (err, questiom)
     */
    static async load(questionId){
        return await this.findOne({uuid:questionId})
    }

}

Question.register()


if(require.main === module) {

    const Chance = require('chance');
    const _ = require('lodash')

    let chance = new Chance()

    let testInfo = {
        id: chance.guid(),
        gameId: chance.guid(),
        order: chance.d12(),
        difficulty: chance.d6(),
        text: chance.paragraph(),
        // -1 if not open yet, 1 if open and 0 if closed (but was open)
        state: _.sample([-1,0,1]),
        startTime: chance.timestamp(),
        endTime: chance.timestamp(),
        answer: chance.guid(),
        answerSecondary: chance.guid(),
        choices: [chance.guid(), chance.guid(), chance.guid(), chance.guid()]
    }

    let quest = new Question(testInfo)

    quest.save((err, quest1) => {
        
        //Logger.info('Question 1 = ', quest1)

        Question.load(testInfo.gameId, testInfo.id, (err, quest2)=>{

            if (err){
                Logger.error(err)
            }

            Logger.info('Question 2 = ', quest2)
            

        })


    })


}
else {
    module.exports = Question
}

