import Chance from "chance";
import {Profiler} from "../utils/Profiler";
import _ from "lodash";
import {Column, Entity, Model, Query, Stash} from "../index";
import Logger from "../utils/Logger";
import { NumericIndex } from "../indexing/NumericIndex";

async function main() {

    Stash.connect({
        bucket: process.env.AWS_BUCKET,
        prefix: process.env.AWS_ROOT_FOLDER,
        region: process.env.AWS_REGION,
        rootUrl: process.env.AWS_CLOUDFRONT_URL,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_SECRET,
    });

    //Logger.debug(`Models = `, models);

    @Entity({expires: 100})
    class Person extends Model {

        //@PrimaryGeneratedColumn()
        //id: number;

        @Column({unique: true})
        email: string;

        @Column({type: 'integer', index: true})
        age: number;

        @Column({type: 'integer', index: true})
        score: number;

        @Column({index: true})
        fullName: string;

        @Column({index: true})
        lastIp: string;

        @Column({index: true})
        lastLogin: Date;

        @Column({type: 'json'})
        preferences: object;

        @Column({type: 'array'})
        tags: string[];

        @Column({default: 'user', index: true})
        level: string;

        @Column({default: 'active', index: true})
        status: string;

    }


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


    const indexer = new NumericIndex('Person');

    // chance.floating({ min: 0, max: 100 }),
    const chance = new Chance();
    const no = 1;
        
   /*
    for (let i=0; i<no; i+=1){
        
        let name:string = chance.name({ nationality: 'en' });
        //let score:number = chance.integer({ min: -9999999, max: 9999999 });

        let score: number = chance.integer({ min: 0, max: 99999 });

        //let score:number = chance.floating({ min: 0, max: 100 });

        Profiler.start('create index');
        await indexer.add(i+1, 'score', score);
        Profiler.stop('create index');

        if (i % 100 === 0) {
            console.debug(i)
            Profiler.showResults();
        }

    }

    Profiler.showResults();
    
*/

    //let x:number = 86600;
    //Logger.debug(x.toPrecision(1));

    //Logger.debug(indexer.mostSignificantDigitNumbers(x));
    

    for (let i=0; i<no; i+=1){

        //let m1: number = chance.integer({ min: -9999999, max: 9999999 });
        //let m2: number = chance.integer({ min: m1+1, max: 9999999 });

        let m1: number = chance.integer({ min: 0, max: 9999999 });
        let m2: number = chance.integer({ min: m1+1, max: 9999999 });
        
        console.log(`Getting files between ${m1} and ${m2}`);       

        let qry:Query = {
            score: {$gte: 86600, $lt: 100000}
        }

        Profiler.start('listFilesInRange');
        const files = await indexer.getIds('score', qry.score);    


        let ms:number = Profiler.stop('listFilesInRange');
        console.log(`Found ${files.length} files between ${m1} and ${m2} in ${ms} ms`);       
    }

    Profiler.showResults();        






}

// Uncomment to run the example
main();

