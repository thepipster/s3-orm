
//const ExpressMock = require('./ExpressMock')
const firebase = require('firebase')

/**
 * Mock data for tests
 */
var TestMocks = {

    gameId: Math.floor(Date.now() / 8.64e7), // epoch time, in days

    user: {
        // /id: Math.round(Date.now() / (60000)), // epoch time, minutes
        id: ''+1,
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImUwZDU1NjQ5Yzk4MWI1ZWE2YTZkNzBhYTIyMDhiYWMxNjRkYTViMmMifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcG9wLWN1bHR1cmUtbGl2ZSIsImF1ZCI6InBvcC1jdWx0dXJlLWxpdmUiLCJhdXRoX3RpbWUiOjE1MTk1OTgzMTMsInVzZXJfaWQiOiJLMU52UTRQYzhjVDFGVlBYOExIMEViSFlJMlcyIiwic3ViIjoiSzFOdlE0UGM4Y1QxRlZQWDhMSDBFYkhZSTJXMiIsImlhdCI6MTUxOTU5ODMxMywiZXhwIjoxNTE5NjAxOTEzLCJlbWFpbCI6Im1pa2VAYXJzZW5pY3NvdXAuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbIm1pa2VAYXJzZW5pY3NvdXAuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.nx-SvxWdC9GccELf5vIIqjfnw5kYvtY9-QuzAKg-0YjW-U-XUzNaCthNf8VKgWZsRpWB8HGUjnGwwZ8Z1Kx-cHQmpLq9yqkYZctvpJckOw88f1-9w3CH63cUUmKVBeTWLKWqcCMwogu5VeTNPtOODUSSHfpyrw9PQhirWpznAkIguBln_RZBSmQq01kyt5merxJ04Rz7X6rj49zL3sZrf3uN108exLFvGCqd1_GtNlDhDV2e0xtqeeRHAQmxCoEA-NY04kH08IgX9gsPPjGlW7i07rALTSg3wm3BdCtWLp26VSRiNlvZfWVEf7gZLXoyb-V4pkkF-LsSH4Jqu_vhXQ',
        email: 'test@tester.com',
        username: 'test@tester.com'
    },

    express: {
        req: {
            query: {},
            params: {},
            body: {},
        },
        //res: ExpressMock
        res: {}
    },

    gameState: {
        id: 1,
        noUsersInGame: 567467,
        noUsers: 1056354, 
        isStarted: 0,
        currentQuestionId: 5,
        questionIds: [1,2,3,4,5]
    },

    question: {
        id: 1,
        order: 0,
        gameId: 1,
        text: "Last year, an online contest run by which country’s government to name a $300 million research vessel resulted in the crowdsourced name Boaty McBoatface?",
        choices: ["Canada", "Sweden", "England", "Australia"],
        answer: 2,
        answerSecondary: 3,
        difficulty: 1,
        votes: []
    },

    generateToken(callback) {

        require('dotenv').config({ silent: false })
        
        let config = {
            apiKey: process.env.FIREBASE_KEY,
            authDomain: process.env.FIREBASE_APP_NAME + ".firebaseapp.com",
            databaseURL: "https://"+process.env.FIREBASE_APP_NAME+".firebaseio.com",
            projectId: process.env.FIREBASE_APP_NAME,
            storageBucket: process.env.FIREBASE_APP_NAME + ".appspot.com",
            messagingSenderId: "firebase-adminsdk-hdqro@"+process.env.FIREBASE_APP_NAME+".iam.gserviceaccount.com"
        };

        firebase.initializeApp(config)

        //firebase.auth().onAuthStateChanged(function (user) {

        //});

        // Generate a token from test credentials
        firebase
            .auth()
            .signInWithEmailAndPassword(process.env.TESTER_EMAIL, process.env.TESTER_PASSWORD)
            .then(
                user => {
                    firebase
                        .auth()
                        .currentUser.getIdToken(/* forceRefresh */ true)
                        .then(function (idToken) {
                            TestMocks.user.token = idToken
                            TestMocks.user.id = user.uid
                            callback(null, idToken)
                        })
                        .catch(function (err) {
                            callback(err)
                        });
                },
                err => {
                    callback(err)
                }
            );


    }

}

module.exports = TestMocks;