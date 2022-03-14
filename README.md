# The ORM for AWS S3!

This is a simple object relation model (ORM) that uses S3 as it's storage engine. So why the heck would you want that? End of the day, you should probably use a database. But.... S3 is just a giant key-value store, which means this is possible. So why not?

So this is really just an experiment. But in situations where your data moves slowly, you're dealing with fairly basic queries and you need that massively scalable infrastructure that comes with S3, then this actually works pretty well.

When I started building this, it was originally designed for a simple content management system (CMS). In that case, the website pulls content/data from JSON objects stored on S3 - with the static assets also stored on S3. This means the website will scale massively and is super cheap (i.e. no back-end infrastructure at all, and S3 is dirt cheap).

So it's a crazy idea, but actually proved really useful - but in narrow use cases.

## Documentation

### Terminology

* **schema**: Schema is the data definition for a model, i.e. it describes the data used by a model.
* **model**: A model is a class that encapsulates the data schema, and allows you to create instances of that model.
* **document**: This is an instance of a model, i.e. the underlying data decorated with the model methods.
* **field**: The key of the schema, i.e. the "column" name of your documents.

### Schema definition

A schema object is required when defining a model. This is a basic object with key/values where the value is the field defintion. A field definition can consist simply of the field type, or be an object with a `type` key and other optional values set such as an `index`. Here is an example of such a schema;

```js
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
```

### Field definition

A field can have the following keys

| name | Description |
| ---- | ----------- |
| type | The field data type, such as `DataTypes.Number` |
| index | Sets an index for a field, i.e. enables you to query on this field |
| unique | Sets an unique for a field, i.e. enforces uniqueness for this field and enables you to query on it  |
| default | Specify a default value for this field, this can also be a function |
| defaultValue | Same as default |
| onUpdateOverride | A function that is called when the document is saved, the field value is set by the output of this function during the save |

#### Field types

```js
DataTypes.Id    // Integer, id field, this is automatically added to all models
DataTypes.Uuid    // String, a uuid v4 field, will generate a uuid automically if no value set during a save
DataTypes.Json    // Json object
DataTypes.Float    // Float
DataTypes.Number    // Integer
DataTypes.Integer    // Integer
DataTypes.String    // String
DataTypes.Boolean    // Boolean
DataTypes.Array    // Simple array of basic types
DataTypes.Date    // Date
```

### Queries

You can query any data type that you have an index set for. If an index is not set, all queries will throw a no-index error. A query is simply an object with key/values that correspond to the query you wish to perform. For numeric and date fields you can use the `$gt`, `$gte`, `$lte` and `$lt` operators to bound queries. If multiple keys exists, then the query will be a `and` of all the keys. An `or` operator is currently not support, but planned for the future. Example queries are;

```js
// Query for all documents where the fullName field contains a substring of 'bob'
qry = {fullName: 'bob'};
// Query for all documents where the fullName field contains a substring of 'ob' (so bob would match this)
qry = {fullName: 'ob'};
// Query for all documents where the age = 20
qry = {age: 20};
// Query for all documents where the age is greater than or equal to 19
qry = {age: {$gte: 19}};
// Query for all documents where the fullName field contains a substring of 'bob' AND the age is greater than or equal to 19
qry = {fullName: 'bob', age: {$gte: 19}};
// Query for all documents where the score is les than 50.56
qry = {score: {$lt: 50.56}};
```

### Query options

Queries (`find`, `findOne`, `getIds`, `count`, `distinct`) can be passed additional options, these include;

| name | Default | Description |
| ---- | ----------- | ---- |
| offset | 0 | Skip the first n documents |
| limit | 1000 | Limit the number of returned documents to x |
| order | 'ASC' | The order of the returned results, can be ASC (ascending) or DESC (descending)

### Model methods

#### Instance methods

| name | Description |
| ---- | ----------- |
| constructor(data) | Create an instance of this model (document), and optionally pass in the initial data |
| toJson() | Returns the document data as Json |
| remove() | Delete this document |
| save() | Save this document to S3 |

#### Static methods

| name | Description |
| ---- | ----------- |
| resetIndex() | Clears all the indices and attempts to rebuild them. Note this can take some time for large data sets |
| exists(id) | Checks if a document exists with this id (this is faster than using a find) |
| max(field) | Gets the maximum value for this field name. The field must be a numeric type |
| count(query) | Gets a count of the number of documents for the given query |
| distinct(field, query) | Returns an array of disctinct values for the given field. You can optionally pass a querry to restrict the set of documents looked at |
| remove(id) | Delete a document with the given id |
| loadFromId(id) | Load a document from the given id |
| findOne(query, options) | Find and return a single document using the given query and options |
| find(query, options) | Find and return an array of documents using the given query and options |
| getIds(query, options) | Same as find, but only returns an array of id's. This is quicker than a find, so good to use if you only need the id's |
| generateMock() | Generate random test data that matches the model schema |


### Storm methods

#### Instance methods

| name | Description |
| ---- | ----------- |
| constructor(s3) | Create a new instance of the s3 ORM ("storm"), you must pass in an instance of a S3 engine (either client or server side engine) |
| define(name, schema, options)) | A factory method to create and register a model class |
| listModels() | Give a list of all the models currently registered |

## Basic usage

```js

const {ClientEngine, Engine, Storm, DataTypes} = require('s3-orm');

// Create an engine to the back-end key-value store

// You can use an engine for browsers, that is read only (using axios for basic http requests to S3)
const s3 = new ClientEngine(); 

// OR, for server-side you can use the AWS S3 SDK for full read/write access
const s3 = new Engine({acl:'public-read'});

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

* Expires index
* Versioning
* Indexing arrays and json object