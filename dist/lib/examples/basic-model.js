"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const chance_1 = __importDefault(require("chance"));
const index_1 = require("../index");
const Profiler_1 = require("../utils/Profiler");
const test_data_1 = require("./test-data");
const Person_1 = require("./Person");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const chance = new chance_1.default();
index_1.Stash.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.AWS_ROOT_FOLDER,
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
    indexingEngine: 'basic',
});
// uuid: { type: DataTypes.String, default: uuidv4}, 
// Pass in the engine, this allows swapping out the back-end DB 
//const storm = new Stash();
setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
    //const models = await storm.listModels();
    //Logger.debug(`Models = `, models);
    function createPerson() {
        return __awaiter(this, void 0, void 0, function* () {
            let tmp = new Person_1.Person({
                email: chance.email(),
                age: chance.age(),
                score: chance.floating({ min: 0, max: 100 }),
                fullName: chance.name({ nationality: 'en' }),
                lastIp: chance.ip(),
                lastLogin: chance.date(),
                tags: chance.n(chance.word, 5),
                preferences: {
                    stuff: chance.word(),
                    moreStuff: chance.word()
                }
            });
            return yield tmp.save();
        });
    }
    function removePeople() {
        return __awaiter(this, void 0, void 0, function* () {
            let people = yield Person_1.Person.find({});
            for (let i = 0; i < people.length; i += 1) {
                let tmp = people[i];
                index_1.Logger.debug(`Removing ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id})`);
                yield tmp.remove();
            }
            index_1.Logger.debug(`Removed ${people.length} people`);
        });
    }
    function loadPeople() {
        return __awaiter(this, void 0, void 0, function* () {
            let peeps = [];
            for (let i = 0; i < test_data_1.people.length; i += 1) {
                let tmp = yield Person_1.Person.findOne({ where: { id: test_data_1.people[i].id } });
                if (!tmp) {
                    index_1.Logger.error(`Could not find ${test_data_1.people[i].id}. Creating ${test_data_1.people[i].id}`);
                    tmp = new Person_1.Person(test_data_1.people[i]);
                    yield tmp.save();
                }
                index_1.Logger.debug(`Loaded ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id})`);
                peeps.push(tmp);
            }
            return peeps;
        });
    }
    index_1.Logger.debug('Loading people');
    yield removePeople();
    let list = yield loadPeople();
    index_1.Logger.debug(`We have ${list.length} people in our test data.`);
    // Test queries
    const queries = [
        //{query: {}},
        { query: { fullName: 'Mamie Ryan' } },
        { query: { age: 20 } },
        { query: { age: { $gte: 19 } } },
        { query: { fullName: 'bob', age: { $gte: 19 } } },
        //{score:{Op.$gte: 50.56}}
    ];
    for (let i = 0; i < queries.length; i += 1) {
        Profiler_1.Profiler.start('test-query');
        let qry = queries[i];
        index_1.Logger.debug(`Query ${i + 1}: ${JSON.stringify(qry)}`);
        let res = yield Person_1.Person.find({ where: qry.query });
        index_1.Logger.debug(`Result ${i + 1}, found ${res.length}`, res);
        Profiler_1.Profiler.stop('test-query');
    }
    Profiler_1.Profiler.showResults();
}), 100);
//# sourceMappingURL=basic-model.js.map