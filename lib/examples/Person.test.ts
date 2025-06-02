import {Person} from './Person';
import {people} from './test-data';
import {Storm} from '../index';
import Logger from '../utils/Logger';
import _ from 'lodash';

let testPeople:Person[] = [];

Storm.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.AWS_ROOT_FOLDER,
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
});

const queries = [
    {query: {}},
    {query: {fullName: 'Mamie Ryan'}},
    {query: {age: 20}},
    {query: {age: {$gte: 19}}},
    {query: {fullName: 'bob', age: {$gte: 19}}},
    //{score:{Op.$gte: 50.56}}
];

describe('example.Person', () => {

    beforeAll(async () => {
        for (let i=0; i<people.length; i+=1){            
            let tmp: Person = await Person.findOne({where: {id: people[i].id}});
            Logger.debug(`Loaded ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id}, lastLogin = ${tmp.lastLogin})`);
            testPeople.push(tmp);
        }
        return;
    });

    afterAll(async () => {
        //for (let i=0; i<testPeople.length; i+=1){
        //    await testPeople[i].remove();
        //}
    });
                          
    test('$gt', async () => {

        const peeps = await Person.find({where: {age: {$gt: 62}}});
        
        expect(peeps.length).toEqual(1);

        return;
    })

    test('$gte', async () => {

        const peeps = await Person.find({where: {age: {$gte: 62}}});
        
        expect(peeps.length).toEqual(2);

        return;
    })

    test('$lt', async () => {

        const peeps = await Person.find({where: {age: {$lt: 31}}});
        
        expect(peeps.length).toEqual(1);

        return;
    })

    test('$lte', async () => {

        const peeps = await Person.find({where: {age: {$lte: 31}}});
        
        expect(peeps.length).toEqual(2);

        return;
    })    

    test('email', async () => {

        const peep = await Person.findOne({where: {email: 'ujgodfed@ajtis.jp'}});
        
        expect(peep).not.toBeNull();
        expect(peep.fullName).toEqual('Bryan Douglas');

        return;
    })        

    test('lastLogin', async () => {

        const peeps = await Person.find({where: {
            lastLogin: {
                $gt: new Date('2096-03-13T13:41:50.243Z')
            }
        }});

        Logger.debug(`Found ${peeps.length} peeps`, _.map(peeps, 'lastLogin'));

        expect(peeps.length).toEqual(3);

        return;
    })        

    
    test('distinct', async () => {
        const ages = await Person.distinct('age', {});
        expect(ages.length).toEqual(14);
        return;
    })       
        
    test('max', async () => {
        const maxAge = await Person.max('age');
        expect(maxAge).toEqual(65);
        return;
    })       
        
    test('min', async () => {
        const maxAge = await Person.min('age');
        expect(maxAge).toEqual(20);
        return;
    })       
        
    
    test('count', async () => {
        const maxAge = await Person.count({});
        expect(maxAge).toEqual(people.length);
        return;

    })       
        
    
});