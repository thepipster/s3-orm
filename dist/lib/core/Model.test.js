"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = __importDefault(require("../../lib/utils/Logger"));
const chance_1 = __importDefault(require("chance"));
const lib_1 = require("../../lib");
const chance = new chance_1.default();
const storm = new lib_1.Stash();
lib_1.Stash.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.AWS_TEST_ROOT_FOLDER,
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
});
jest.setTimeout(60000);
let TestModel = class TestModel extends lib_1.Model {
};
__decorate([
    (0, lib_1.Column)({ unique: true }),
    __metadata("design:type", String)
], TestModel.prototype, "aUniqueString", void 0);
__decorate([
    (0, lib_1.Column)({ index: true }),
    __metadata("design:type", String)
], TestModel.prototype, "aString", void 0);
__decorate([
    (0, lib_1.Column)({ index: true }),
    __metadata("design:type", Date)
], TestModel.prototype, "aDate", void 0);
__decorate([
    (0, lib_1.Column)({ index: true }),
    __metadata("design:type", Date)
], TestModel.prototype, "aDate2", void 0);
__decorate([
    (0, lib_1.Column)({ index: true }),
    __metadata("design:type", Number)
], TestModel.prototype, "aNumber", void 0);
__decorate([
    (0, lib_1.Column)({ type: 'integer', index: true }),
    __metadata("design:type", Number)
], TestModel.prototype, "aInteger", void 0);
__decorate([
    (0, lib_1.Column)({ type: 'float', index: true }),
    __metadata("design:type", Number)
], TestModel.prototype, "aFloat", void 0);
__decorate([
    (0, lib_1.Column)({ type: 'boolean', index: true }),
    __metadata("design:type", Number)
], TestModel.prototype, "aBoolean", void 0);
__decorate([
    (0, lib_1.Column)({ type: 'array' }),
    __metadata("design:type", Array)
], TestModel.prototype, "aArray", void 0);
__decorate([
    (0, lib_1.Column)({ type: 'json' }),
    __metadata("design:type", Number)
], TestModel.prototype, "aJSONObject", void 0);
__decorate([
    (0, lib_1.Column)({ type: 'json' }),
    __metadata("design:type", Number)
], TestModel.prototype, "aObject", void 0);
TestModel = __decorate([
    (0, lib_1.Entity)({ expires: 100 })
], TestModel);
function generateMock() {
    return {
        aUniqueString: chance.word(),
        aString: chance.sentence({ words: 6 }),
        aDate: chance.date(),
        aDate2: chance.date(),
        aNumber: chance.floating({ min: 0, max: 100 }),
        aInteger: chance.integer(),
        aFloat: chance.floating({ min: 0, max: 100 }),
        aBoolean: chance.bool(),
        aArray: chance.n(chance.word, 5),
        aObject: {
            stuff: chance.word(),
            moreStuff: chance.word()
        },
        aJSONObject: {
            stuff: chance.word(),
            moreStuff: chance.word()
        }
    };
}
var testInfo = generateMock();
var testInfo2 = generateMock();
var testInfo3 = generateMock();
var test1;
var test2;
var test3;
//testInfo.id = '1abc'
//testInfo2.id = '2def'
//testInfo3.id = '3ghi'
testInfo.aFloat = 5.5;
testInfo2.aFloat = 15.6;
testInfo3.aFloat = 21.2;
function doCheck(info, testDoc) {
    if (!testDoc) {
        testDoc = testInfo;
    }
    //expect(info['id']).toEqual(testDoc['id'])
    expect(info['aString']).toEqual(testDoc['aString']);
    expect(typeof info['aString']).toEqual(typeof testDoc['aString']);
    //expect(info['aDate']).toEqual(testDoc['aDate'])
    //expect(typeof info['aDate']).toEqual(typeof testDoc['aDate'])
    //expect(info['aDate2']).toEqual(testDoc['aDate2'])
    //expect(typeof info['aDate2']).toEqual(typeof testDoc['aDate2'])
    expect(info['aNumber']).toEqual(testDoc['aNumber']);
    expect(typeof info['aNumber']).toEqual(typeof testDoc['aNumber']);
    expect(info['aInteger']).toEqual(testDoc['aInteger']);
    expect(typeof info['aInteger']).toEqual(typeof testDoc['aInteger']);
    expect(info['aFloat']).toEqual(testDoc['aFloat']);
    expect(typeof info['aFloat']).toEqual(typeof testDoc['aFloat']);
    expect(info['aBoolean']).toEqual(testDoc['aBoolean']);
    expect(typeof info['aBoolean']).toEqual(typeof testDoc['aBoolean']);
    expect(info['aArray']).toEqual(testDoc['aArray']);
    expect(typeof info['aArray']).toEqual(typeof testDoc['aArray']);
    expect(info['aObject']).toEqual(testDoc['aObject']);
    expect(typeof info['aObject']).toEqual(typeof testDoc['aObject']);
    expect(info['aJSONObject']).toEqual(testDoc['aJSONObject']);
    expect(typeof info['aJSONObject']).toEqual(typeof testDoc['aJSONObject']);
    /*
    for (let key in testInfo){


        Logger.debug(`for key ${key}, info = ${info[key]} testInfo = ${testInfo[key]}`)
        expect(info[key]).toEqual(testInfo[key])
        expect(typeof info[key]).toEqual(typeof testInfo[key])
    }
    */
}
describe('BasdeModel', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Timeout to wait for redis connection
        test1 = new TestModel(testInfo);
        test2 = new TestModel(testInfo2);
        test3 = new TestModel(testInfo3);
        yield test1.save();
        yield test2.save();
        yield test3.save();
        return;
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        let ids = yield TestModel.getIds({});
        //for (let i=0; i<ids.length; i+=1){
        //    await TestModel.remove(ids[i])
        //}
        return;
    }));
    test('the id is not set until a save', () => __awaiter(void 0, void 0, void 0, function* () {
        let test = new TestModel(testInfo);
        expect(test.id).toEqual(null);
        return;
    }));
    test('new()', () => __awaiter(void 0, void 0, void 0, function* () {
        let test = new TestModel(testInfo);
        doCheck(test, testInfo);
        return;
    }));
    test('save()', () => __awaiter(void 0, void 0, void 0, function* () {
        const loaded1 = yield TestModel.loadFromId(test1.id);
        Logger_1.default.debug(loaded1);
        doCheck(loaded1, test1);
        return;
    }));
    test('unique', () => __awaiter(void 0, void 0, void 0, function* () {
        let testWord = chance.sentence({ words: 6 });
        let test1 = new TestModel(generateMock());
        test1.aUniqueString = testWord;
        var emittedError = false;
        yield test1.save();
        try {
            let test2 = new TestModel(generateMock());
            test2.aUniqueString = testWord;
            //test2.aUniqueString = test1.aUniqueString;
            yield test2.save();
        }
        catch (err) {
            //expect(err.toString().search('is unique, and already exists')).not.toEqual(-1)
            //expect(err).toBeInstanceOf(UniqueKeyViolationError);
            emittedError = true;
        }
        expect(emittedError).toEqual(true);
        return;
    }));
    /*
    
        test('loadFromId()', async () => {
    
            let loaded = await TestModel.loadFromId(testInfo.id);
            doCheck(loaded, testInfo);
    
            let loaded2 = await TestModel.loadFromId(testInfo2.id);
            doCheck(loaded2, testInfo2);
    
            let loaded3 = await TestModel.loadFromId(testInfo3.id);
            doCheck(loaded2, testInfo3);
    
            return
        })
    */
    /*
    test('loadFromId(null)', async () => {
        let loaded = await TestModel.loadFromId(null);
        expect(loaded).toEqual(null);

        let loaded2 = await TestModelClient.loadFromId(null);
        expect(loaded2).toEqual(null);
        return
    })

    test('exists()', async () => {

        let isExist = await TestModel.exists(testInfo.id)
        expect(isExist).toEqual(true)

        let isNotExist = await TestModel.exists('dsgsdgs')
        expect(isNotExist).toEqual(false)

        isExist = await TestModelClient.exists(testInfo.id)
        expect(isExist).toEqual(true)

        isNotExist = await TestModelClient.exists('dsgsdgs')
        expect(isNotExist).toEqual(false)

        return
    })

    test('findOne(string)', async () => {
        let doc = await TestModel.findOne({aString:testInfo.aString});
        doCheck(doc);

        doc = await TestModelClient.findOne({aString:testInfo.aString});
        doCheck(doc);
        return
    })

    // Should return all the id's
    test('getIds({})', async () => {
        let docs = await TestModel.getIds({});
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1);
        expect(docs.indexOf(testInfo2.id)).not.toEqual(-1);
        expect(docs.indexOf(testInfo3.id)).not.toEqual(-1);

        docs = await TestModelClient.getIds({});
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1);
        expect(docs.indexOf(testInfo2.id)).not.toEqual(-1);
        expect(docs.indexOf(testInfo3.id)).not.toEqual(-1);
        return
    })

    test('getIds({integer})', async () => {
        let docs = await TestModel.getIds({aInteger:testInfo.aInteger})
        expect(docs.length).toEqual(1)
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.id)).toEqual(-1)
        expect(docs.indexOf(testInfo3.id)).toEqual(-1)

        return
    })

    test('getIds({string})', async () => {
        let docs = await TestModel.getIds({aString:testInfo.aString})
        expect(docs.length).toEqual(1)
        expect(docs.indexOf(testInfo.id)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.id)).toEqual(-1)
        expect(docs.indexOf(testInfo3.id)).toEqual(-1)

        return
    })

    test('find(<does not exist>)', async () => {
        let docs = await TestModel.find({aString:'xxxxxx'})
        expect(docs.length).toEqual(0)

        return
    })

    test('find(<negative score>)', async () => {
        let docs = await TestModel.find({aInteger:{$gte:-10000, $lt: 0}});
        for (let i=0; i<docs.length; i+=1){
            expect(docs[i].aInteger).toBeLessThan(0);
        }
        return
    })

    test('find(string)', async () => {
        let docs = await TestModel.find({aString:testInfo.aString})
        expect(docs.length).toEqual(1)
        doCheck(docs[0])
        return
    })

    test('find(integer)', async () => {
        let docs = await TestModel.find({aInteger:testInfo.aInteger})
        expect(docs.length).toEqual(1)
        doCheck(docs[0])
        return
    })

    test('find(float)', async () => {
        let docs = await TestModel.find({aFloat:testInfo.aFloat})
        expect(docs.length).toEqual(1)
        doCheck(docs[0])
        return
    })

    test('find({range})', async () => {
        // testInfo.aFloat = 5.5
        // testInfo2.aFloat = 15.6
        // testInfo3.aFloat = 21.2
        let query = {
            aFloat: {
                $gte: 15.0,
                $lte: 22.0
            }
        }
        let docs = await TestModel.find(query)
        expect(docs.length).toEqual(2)
        doCheck(docs[0], testInfo2)
        return
    })


    test('find({range, limit})', async () => {
        // testInfo.aFloat = 5.5
        // testInfo2.aFloat = 15.6
        // testInfo3.aFloat = 21.2
        let query = {
            aFloat: {
                $gt: 15.0,
                $lte: 22.0,
            }
        }
        let opts = {
            limit: 1,
            offset: 1
        }
        let docs = await TestModel.find(query, opts)
        expect(docs.length).toEqual(1)
        doCheck(docs[0], testInfo3)
        return
    })

    test('distinct(aString, null)', async () => {
        
        let docs = await TestModel.distinct('aString')
        
        let allDocs = await TestModel.find({})

        //Logger.warn('strings = ', map(allDocs, 'aString'))
        let allStrings = uniq(map(allDocs, 'aString'))
        //Logger.warn('unique strings = ', allStrings)

        expect(docs.length).toEqual(allStrings.length)

        expect(docs.indexOf(testInfo.aString)).not.toEqual(-1)
        expect(docs.indexOf(testInfo2.aString)).not.toEqual(-1)
        expect(docs.indexOf(testInfo3.aString)).not.toEqual(-1)
        return
    })

    test('distinct(aString, {aString})', async () => {
        let docs = await TestModel.distinct('aString', {aString:testInfo.aString})
        expect(docs.length).toEqual(1)
        expect(docs.indexOf(testInfo.aString)).not.toEqual(-1)
        return
    })


    test('count({})', async () => {
        let no = await TestModel.count({})
        let allIds = await TestModel.getIds()
        expect(no).toEqual(allIds.length)
        return
    })

    test('count({aString})', async () => {
        let no = await TestModel.count({aString:testInfo.aString})
        expect(no).toEqual(1)
        return
    })

    test('static remove(id)', async () => {

        var testInfo = TestModel.generateMock()
        let test = new TestModel(testInfo)
        let doc = await test.save()

        await TestModel.remove(doc.id)

        // Try to load it
        var tmp = await TestModel.loadFromId(doc.id);
        expect(tmp).toEqual(null);

        return
    })

    test('remove()', async () => {

        var testInfo = TestModel.generateMock()
        let test = new TestModel(testInfo)
        let doc = await test.save()
        const testId = doc.id;

        await doc.remove()

        // Try to load it
        var tmp = await TestModel.loadFromId(testId);
        expect(tmp).toEqual(null);

        return
    })
        */
    /*
    test('save(expires)', async () => {

        const expiresSeconds = 2
        var testInfo = TestModel.generateMock()
        let test = new TestModel(testInfo)
        let ghost = await test.save({expires:expiresSeconds})

        let isExist = await TestModel.exists(ghost.id)
        expect(isExist).toEqual(true)

        await BaseModelHelper.sleep(expiresSeconds*1000)

        // Force to update expire indices
        await ghost._clearExpireIndices()

        let isExist2 = await TestModel.exists(ghost.id)
        expect(isExist2).toEqual(false)

        return
    })
    */
    /*
    test('versioning', async () => {

        let state = new TestModel(testInfo)
        let temp = await state.save()
        let testId = temp.id

        let testState1 = await TestModel.loadFromId(testId)
        testState1.aString = 'blarg-state1' // <-- we don't want to keep this

        // Now make changes to the 2nd one, and save
        let testState2 = await TestModel.loadFromId(testId)
        testState2.aNumber = testInfo.aNumber + 164 // <!-- should keep this
        testState2.aString = 'blarg-state2' // <!-- problem, this is over written by changes to testState1
        await testState2.save()

        // Now save state 1, which would over-write changes to testState2
        await testState1.save()

        let confirmState = await TestModel.loadFromId(testId)

        // Expect to keep the `aString` from testState1 and the `aNumber` from testState2
        // i.e. merge the changes
        expect(confirmState.aString).toEqual(testState1.aString)
        expect(confirmState.aNumber).toEqual(testState2.aNumber)
        
        return

    });
    */
});
//# sourceMappingURL=Model.test.js.map