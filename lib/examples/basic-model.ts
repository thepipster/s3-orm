import _ from "lodash";
import Chance from "chance";
import {Logger, Column, Entity, Model, Query, Stash} from "../index";
import {Profiler} from "../utils/Profiler";
import {people} from "./test-data";
import {Person} from "./Person";
import * as dotenv from 'dotenv';

dotenv.config();

const chance = new Chance();

Stash.connect({
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

setTimeout( async ()=> {

    //const models = await storm.listModels();
    //Logger.debug(`Models = `, models);



    async function createPerson(): Promise<Person> {
        let tmp:Person = new Person({
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
        return await tmp.save();
    }

    async function removePeople(){
        let people:Person[] = await Person.find({});
        for (let i=0; i<people.length; i+=1){
            let tmp:Person = people[i];
            Logger.debug(`Removing ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id})`);
            await tmp.remove();
        }
        Logger.debug(`Removed ${people.length} people`);
    }

    async function loadPeople(){
        let peeps:Person[] = [];
        for (let i=0; i<people.length; i+=1){
            
            let tmp: Person = await Person.findOne({where: {id: people[i].id}});
            
            if (!tmp) {
                Logger.error(`Could not find ${people[i].id}. Creating ${people[i].id}`);
                tmp = new Person(people[i]);
                await tmp.save();
            } 

            Logger.debug(`Loaded ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id})`);
            peeps.push(tmp);
        }
        return peeps;
    }

    
    Logger.debug('Loading people');
    await removePeople();
    let list:Person[] = await loadPeople();

    Logger.debug(`We have ${list.length} people in our test data.`);

    // Test queries
    const queries = [
        //{query: {}},
        {query: {fullName: 'Mamie Ryan'}},
        {query: {age: 20}},
        {query: {age: {$gte: 19}}},
        {query: {fullName: 'bob', age: {$gte: 19}}},
        //{score:{Op.$gte: 50.56}}
    ];
    
    for (let i=0; i<queries.length; i+=1){
        Profiler.start('test-query');
        let qry = queries[i];
        Logger.debug(`Query ${i+1}: ${JSON.stringify(qry)}`);
        let res = await Person.find({where: qry.query});
        Logger.debug(`Result ${i+1}, found ${res.length}`, res);
        Profiler.stop('test-query');
    }
    
    Profiler.showResults();

}, 100);



