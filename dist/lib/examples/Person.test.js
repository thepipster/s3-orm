"use strict";
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
const Person_1 = require("./Person");
const test_data_1 = require("./test-data");
const index_1 = require("../index");
const Logger_1 = __importDefault(require("../utils/Logger"));
const lodash_1 = __importDefault(require("lodash"));
let testPeople = [];
index_1.Stash.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.AWS_ROOT_FOLDER,
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
});
const queries = [
    { query: {} },
    { query: { fullName: 'Mamie Ryan' } },
    { query: { age: 20 } },
    { query: { age: { $gte: 19 } } },
    { query: { fullName: 'bob', age: { $gte: 19 } } },
    //{score:{Op.$gte: 50.56}}
];
describe('example.Person', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < test_data_1.people.length; i += 1) {
            let tmp = yield Person_1.Person.findOne({ where: { id: test_data_1.people[i].id } });
            Logger_1.default.debug(`Loaded ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id}, lastLogin = ${tmp.lastLogin})`);
            testPeople.push(tmp);
        }
        return;
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        //for (let i=0; i<testPeople.length; i+=1){
        //    await testPeople[i].remove();
        //}
    }));
    test('$gt', () => __awaiter(void 0, void 0, void 0, function* () {
        const peeps = yield Person_1.Person.find({ where: { age: { $gt: 62 } } });
        expect(peeps.length).toEqual(1);
        return;
    }));
    test('$gte', () => __awaiter(void 0, void 0, void 0, function* () {
        const peeps = yield Person_1.Person.find({ where: { age: { $gte: 62 } } });
        expect(peeps.length).toEqual(2);
        return;
    }));
    test('$lt', () => __awaiter(void 0, void 0, void 0, function* () {
        const peeps = yield Person_1.Person.find({ where: { age: { $lt: 31 } } });
        expect(peeps.length).toEqual(1);
        return;
    }));
    test('$lte', () => __awaiter(void 0, void 0, void 0, function* () {
        const peeps = yield Person_1.Person.find({ where: { age: { $lte: 31 } } });
        expect(peeps.length).toEqual(2);
        return;
    }));
    test('email', () => __awaiter(void 0, void 0, void 0, function* () {
        const peep = yield Person_1.Person.findOne({ where: { email: 'ujgodfed@ajtis.jp' } });
        expect(peep).not.toBeNull();
        expect(peep.fullName).toEqual('Bryan Douglas');
        return;
    }));
    test('lastLogin', () => __awaiter(void 0, void 0, void 0, function* () {
        const peeps = yield Person_1.Person.find({ where: {
                lastLogin: {
                    $gt: new Date('2096-03-13T13:41:50.243Z')
                }
            } });
        Logger_1.default.debug(`Found ${peeps.length} peeps`, lodash_1.default.map(peeps, 'lastLogin'));
        expect(peeps.length).toEqual(3);
        return;
    }));
    test('distinct', () => __awaiter(void 0, void 0, void 0, function* () {
        const ages = yield Person_1.Person.distinct('age', {});
        expect(ages.length).toEqual(14);
        return;
    }));
    test('max', () => __awaiter(void 0, void 0, void 0, function* () {
        const maxAge = yield Person_1.Person.max('age');
        expect(maxAge).toEqual(65);
        return;
    }));
    test('min', () => __awaiter(void 0, void 0, void 0, function* () {
        const maxAge = yield Person_1.Person.min('age');
        expect(maxAge).toEqual(20);
        return;
    }));
    test('count', () => __awaiter(void 0, void 0, void 0, function* () {
        const maxAge = yield Person_1.Person.count({});
        expect(maxAge).toEqual(test_data_1.people.length);
        return;
    }));
});
//# sourceMappingURL=Person.test.js.map