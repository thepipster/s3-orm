# Storm ORM

## The ORM for AWS S3!

This is a simple object relation model (ORM) that uses S3 as it's storage engine. So why the heck would you want that? End of the day, you should probably use a database. But.... S3 is just a giant key-value store, which means this is possible. So why not?

So this is really just an experiment. But in situations where your data moves slowly, you're dealing with fairly basic queries and you need that massively scalable infrastructure that comes with S3, then this actually works pretty well.

When I started building this, it was originally designed for a simple content management system (CMS). In that case, the website pulls content/data from JSON objects stored on S3 - with the static assets also stored on S3. This means the website will scale massively and is super cheap (i.e. no back-end infrastructure at all, and S3 is dirt cheap).

So it's a crazy idea, but actually proved really useful - but in narrow use cases.

## Documentation

More detailed docs coming soon, but you can see a simple example below;

## Basic usage

```js

const {BrowserS3Engine, AwsS3Engine, Storm, DataTypes} = require('storm-orm');

// Create an engine to the back-end key-value store

// You can use an engine for browsers, that is read only (using axios for basic http requests to S3)
const s3 = new BrowserS3Engine(); 

// OR, for server-side you can use the AWS S3 SDK for full read/write access
const s3 = new AwsS3Engine({acl:'public-read'});

// Create an instance of the storm ORM with this engine
const storm = new Storm(s3);

// Create a schema
const schema =  {
    email: {type: DataTypes.String, unique: true},
    age: {type: DataTypes.Integer, index: true},
    score: {type: DataTypes.Float, index: true},
    fullName: {type: DataTypes.String, index: true},
    lastIp: DataTypes.String,
    lastLogin: {type: DataTypes.Date, index: true},  
    preferences: DataTypes.Json, 
    tags: DataTypes.Array, 
    level: { type: DataTypes.String, default: 'user', index: true },
    status: { type: DataTypes.String, default: 'active' }
}

// Use the factory method to create the Person class using 
// this schema and any options you want to set
const Person = storm.define('person', schema, {expires: 100});

// You can use the generateMock method to create random data for testing
let pete = new Model();
pete.fullName = 'Pete The Cat';
pete.age = 12;

// Save this instance to S3 (or whatever back-end engine you are using)
await pete.save();

// You can also use the generateMock method to create random data for testing
let randomData = Model.generateMock();
let rando = new Person(randomData);
await rando.save();

// Examples of some basic queries
let people = await Person.find({age: {$gte: 12}});
let people = await Person.find({fullName: 'Cat'});


```

## Roadmap

Expires index
Indexing arrays and json object