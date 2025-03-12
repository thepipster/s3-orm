import Logger from "../utils/Logger";
import _ from "lodash";
import Chance from "chance";
import {Column, Entity, Model, Query} from "../index";
import { Storm } from "../core/Storm";

const chance = new Chance();

Storm.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.AWS_ROOT_FOLDER,
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
});

// uuid: { type: DataTypes.String, default: uuidv4}, 

// Pass in the engine, this allows swapping out the back-end DB 
//const storm = new Storm();

setTimeout( async ()=> {

    //const models = await storm.listModels();
    //Logger.debug(`Models = `, models);

    @Entity({expires: 100})
    class Person extends Model {

        //@PrimaryGeneratedColumn()
        //id: number;

        @Column({index: true})
        email: string;

        @Column({type: 'integer', index: true})
        age: number;

        @Column({type: 'float', index: true})
        score: number;

        @Column({index: true})
        fullName: string;

        @Column({index: true})
        lastIp: string;

        @Column({index: true})
        lastLogin: Date;

        @Column({type: 'json', index: true})
        preferences: object;

        @Column({type: 'array', index: true})
        tags: string[];

        @Column({index: true, default: 'user' })
        level: string;

        @Column({index: true, default: 'active' })
        status: string;

    }

    const No = 10;
    let list:Person[] = await Person.find({});

    for (let i=0; i<list.length; i+=1){
        Logger.debug(list[i].email);
    }

    Logger.debug(`Found ${list.length} items`);
    
    if (list.length < No){
        for (let i=0; i<No; i+=1){

            let tmp = new Person({
                email: chance.email(),
                age: (i==0) ? 20 : chance.age(),
                score: (i==0) ? 50.56 : chance.floating({ min: 0, max: 100 }),
                fullName: (i==0) ? 'Bob The Builder' : chance.name({ nationality: 'en' }), 
                lastIp: chance.ip(),
                lastLogin: chance.date(),
                tags: chance.n(chance.word, 5),
                preferences: {
                    stuff: chance.word(),
                    moreStuff: chance.word()
                }
            });

            try {
                await tmp.save();
            }
            catch(err){
                Logger.error(err.toString());
            }
            Logger.debug(`[Person] Saved with id = ${tmp.id}`, tmp.email);
        }
    }
    
    // Test queries

    //let qry = {fullName: 'bob'};
    //let qry = {fullName: 'ob'};
    //let qry = {age: 20};
    //let qry = {age: {$gte: 19}};
    //let qry = {fullName: 'bob', age: {$gte: 19}};
    //let qry:Query = {score:{Op.$gte: 50.56}};
    let qry:Query = {age: {$gte: 19}};
    let list2:Person[] = await Person.find(qry);

    Logger.debug(`Found ${list2.length} items`, list2);



    /*


    
    let objectList = await Model.find({});

    let tmp = new Model(Model.generateMock());
    tmp.email = objectList[0].email;
    await tmp.save();


    //await Model.resetIndex();

    //let qry = {fullName: 'bob'};
    //let qry = {fullName: 'ob'};
    //let qry = {age: 20};
    //let qry = {age: {$gte: 19}};
    //let qry = {fullName: 'bob', age: {$gte: 19}};
    let qry = {score: 50.56};

    let items = await Model.getIds(qry);
    Logger.debug('query = ', qry);
    Logger.debug('result = ', items);


    //let names = await Model.distinct('fullName', qry);
    //Logger.debug(names)


    let ages = await Model.max('age');
    Logger.debug('ages = ', ages)

    //let indx = Indexing()

    //let idList = Indexing.getIdsForVal();

    //let test = Model.generateMock();

    //Logger.debug(test.toJson());
    //Logger.debug(Model._model());
    //Logger.debug(tmp.toJson());

    //await tmp.save();

    // Now delete
    
    //for (let i=0; i<objectList.length; i+=1){
    //    const obj = objectList[i];
    //    await obj.remove();
   // }
    
   let modelNames = await storm.listModels();
   Logger.debug('model names = ', modelNames);
*/

}, 100);



