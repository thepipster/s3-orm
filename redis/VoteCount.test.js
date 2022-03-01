
"use strict";

const VoteCount = require('./VoteCount')
const ModelTester = require('./utils/ModelTester')

var tester = new ModelTester(VoteCount, ['showId', 'questionId', 'answerId'])
tester.test()


