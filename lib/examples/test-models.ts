import * as dotenv from "dotenv";
import {Stash} from "../index";
import Logger from "../utils/Logger";
import { Person } from "./Person";
import {people} from "./test-data";
import {  S3Client,
    ListObjectsV2Command,
    ListObjectsV2CommandOutput,
    HeadObjectCommand,
    GetObjectCommand,
    GetObjectAclCommand,
    PutObjectAclCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    _Object as S3Object,
    GetObjectCommandOutput,
    ObjectIdentifier,
    ObjectCannedACL } from '@aws-sdk/client-s3';
import { AwsCreds, AwsClientFactory } from "../utils/AwsClientFactory";
dotenv.config();

async function loadPeople(){
    let peeps:Person[] = [];
    for (let i=0; i<people.length; i+=1){
        
        let tmp: Person = await Person.findOne({where: {id: people[i].id}});
        
        if (!tmp) {
            //Logger.error(`Could not find ${people[i].id}. Creating ${people[i].id}`);
            tmp = new Person(people[i]);
            await tmp.save();
        } 

        Logger.debug(`Loaded ${tmp.fullName}, ${tmp.age}, (id = ${tmp.id})`);
        peeps.push(tmp);
    }
    return peeps;
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


setTimeout(async () => {
    try {
        Logger.info("Starting test for Agent model...");

        Logger.info("Initializing AWS client...");
        const awsCreds:AwsCreds = await AwsClientFactory.getClient();
        Logger.info("AWS client initialized!", awsCreds);

        const creds = await AwsClientFactory.getClient();

        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: creds.AccessKeyId,
                secretAccessKey: creds.SecretAccessKey,
                sessionToken: creds.SessionToken,
            },
        });

        /*
        const command = new ListObjectsV2Command({
            Delimiter: '/',
            Prefix: 'audio/',
            Bucket: 'greenhouse-ai-tutor',
        });

        const response = await s3Client.send(command);
        Logger.debug("S3 ListObjectsV2 response:", response);

        */
        
        const s3Config = {
            bucket: process.env.AWS_BUCKET,
            rootUrl: "agents/data/",
            region: process.env.AWS_REGION || 'us-east-1',
            //s3Client
            accessKeyId: creds.AccessKeyId,
            secretAccessKey: creds.SecretAccessKey,
            sessionToken: creds.SessionToken
        }

        await Stash.connect(s3Config);

        //await removePeople();
        //let list:Person[] = await loadPeople();

        //Logger.debug(`We have ${list.length} people in our test data.`);

        let tmp:Person[] = await Person.find({where: {age: {$gte: 19}}});
        Logger.debug(`Found ${tmp.length} people with age >= 19`, tmp[0]);


    } catch (error) {
        Logger.error("Error", error);
    }
}, 500);
