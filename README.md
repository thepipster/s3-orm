# The ORM for AWS S3!

This is a simple object relation model (ORM) that uses S3 as it's storage engine. So why the heck would you want that? End of the day, you should probably use a database. But.... S3 is just a giant key-value store, which means this is possible. So why not?

So this is really just an experiment. But in situations where your data moves slowly, you're dealing with fairly basic queries and you need that massively scalable infrastructure that comes with S3, then this actually works pretty well.

When I started building this, it was originally designed for a simple content management system (CMS). In that case, the website pulls content/data from JSON objects stored on S3 - with the static assets also stored on S3. This means the website will scale massively and is super cheap (i.e. no back-end infrastructure at all, and S3 is dirt cheap).

So it's a crazy idea, but actually proved really useful - but in narrow use cases.

## Instalation and Usage

```bash
yarn add s3-orm
npm install s3-orm
```

# Basic usage

```ts

const {Storm, Entity, Column} = require('s3-orm');

Storm.connect({
    bucket: process.env.AWS_BUCKET,
    prefix: 's3orm/',
    region: process.env.AWS_REGION,
    rootUrl: process.env.AWS_CLOUDFRONT_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
});


// Create an instance of the storm ORM with this engine
const storm = new Storm(config);

// Create a schema
@Entity()
class Person extends Model {

    @Column({unique: true})
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

    @Column({type: 'json'})
    preferences: object;

    @Column({type: 'array'})
    tags: string[];

    @Column({default: 'user', index: true})
    level: string;

    @Column({default: 'active', index: true})
    status: string;

}

// Now you can create a document using this schema (model)
let pete = new Person();
pete.fullName = 'Pete The Cat';
pete.age = 12;

// Save this instance to S3 (or whatever back-end engine you are using)
await pete.save();

// You can also use the generateMock method to create random data for testing
let randomData = Person.generateMock();
let rando = new Person(randomData);
await rando.save();

// Examples of some basic queries
let people = await Person.find({
    where: {
        age: {$gte: 12}
    }
});

let people = await Person.find({
    where: {
        fullName: 'Cat'
    }
});

```

# Terminology

* **schema**: Schema is the data definition for a model, i.e. it describes the data used by a model.
* **model**: A model is a class that encapsulates the data schema, and allows you to create instances of that model.
* **document**: This is an instance of a model, i.e. the underlying data decorated with the model methods.
* **field**: The key of the schema, i.e. the "column" name of your documents.

# Schema definition

A schema object is required when defining a model. This is a basic object with key/values where the value is the field defintion. A field definition can consist simply of the field type, or be an object with a `type` key and other optional values set such as an `index`. Here is an example of such a schema;

```ts
    @Entity()
    class Person extends Model {

        @Column({unique: true})
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

        @Column({type: 'json'})
        preferences: object;

        @Column({type: 'array'})
        tags: string[];

        @Column({default: 'user', index: true})
        level: string;

        @Column({default: 'active', index: true})
        status: string;

    }

```

## Model definition (`@Entity` decorator)

Model definitions are established by using the `@Entity` decorator, with the following options;

| name | Description |
| ---- | ----------- |
| expires | Automatically delete any instances of this Model after x seconds |
| timestamps | Default is true. If set to true, automatically adds and updates `created` and `modified` Date columns. |
| unique | Enforces uniqueness for this column and enables you to query on it  |
| default | Specify a default value for this column, this can also be a function |

## Column definition (`@Column` decorator)

Column definitions are established by using the `@Column` decorator, with the following options;

| name | Description |
| ---- | ----------- |
| type | For finer grain control you can be more specific about the data type, options include 'integer', 'float', 'json' or 'array' |
| index | Sets an index for a column, i.e. enables you to query on this column |
| unique | Sets an unique for a column, i.e. enforces uniqueness for this column and enables you to query on it  |
| default | Specify a default value for this column, this can also be a function |
| encode | Converts the column value to a string to be stored into s3 when the document is saved, you can over-ride to handle cases like when you want to encrypt the column value |
| decode | Converts the column value back to it's correct type from the string stored in s3 when the document is loaded, you can over-ride to handle cases like when you want to decrypt the column value |

### TypeScript Type

```ts
type ColumnParams = {
    type?:  string, 
    index?: boolean;
    unique?: boolean;
    default?: any;
    encode?: callback;
    decode?: callback;
};
```

## Queries

You can query any data type that you have an index set for. If an index is not set, all queries will throw a no-index error. A query is simply an object with key/values that correspond to the query you wish to perform. For numeric and date fields you can use the `$gt`, `$gte`, `$lte` and `$lt` operators to bound queries. If multiple keys exists, then the query will be a `and` of all the keys. An `or` operator is currently not support, but planned for the future. Example queries are;

```ts
// Query for all documents where the fullName column contains a substring of 'bob'
qry = {fullName: 'bob'};
// Query for all documents where the fullName column contains a substring of 'ob' (so bob would match this)
qry = {fullName: 'ob'};
// Query for all documents where the age = 20
qry = {age: 20};
// Query for all documents where the age is greater than or equal to 19
qry = {age: {$gte: 19}};
// Query for all documents where the fullName column contains a substring of 'bob' AND the age is greater than or equal to 19
qry = {fullName: 'bob', age: {$gte: 19}};
// Query for all documents where the score is les than 50.56
qry = {score: {$lt: 50.56}};
```

### TypeScript Type

```ts
type Query = {
    [key: string]: any;
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
}
```

### Queries with options

*Note* any function ((`find`, `findOne`, `getIds`, `count`, `distinct`) that takes a query, accepts either the simple query form above (`Query`) or a more complex form (`QueryOptions`) with options for limit, offset, etc.

Queries can also be passed additional options, these include;

| name | Default | Description |
| ---- | ----------- | ---- |
| offset | 0 | Skip the first n documents |
| limit | 1000 | Limit the number of returned documents to x |
| order | 'ASC' | The order of the returned results, can be ASC (ascending) or DESC (descending)

```ts
// Query for all documents where the fullName column contains a substring of 'bob' AND the age is greater than or equal to 19 - but only return one result
qry = {
    where: {
        fullName: 'bob', age: {$gte: 19}
    },
    limit: 1
}

// Query for all documents where the score is les than 50.56, and use the limit and offset options to enable paging
qry = {
    where: {
        score: {$lt: 50.56}
    },
    limit: 10, // 10 results per "page"
    offset: 20 // skip the first 2 "pages"
}
```

### TypeScript Type


```ts
type QueryOptions = {
    where?: Query;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
    scores?: boolean;
};

```


# Model methods

## Instance methods

| name | Description |
| ---- | ----------- |
| constructor(data) | Create an instance of this model (document), and optionally pass in the initial data |
| toJson() | Returns the document data as Json |
| remove() | Delete this document |
| save() | Save this document to S3 |

## Static methods

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


# Storm methods

## Instance methods

| name | Description |
| ---- | ----------- |
| connect(config) | Create a new instance of the s3 ORM ("storm"), passing in config options |
| listModels() | Give a list of all the models currently registered |



# S3 Setup

If you intend to enable public reads, then you'll need to set the bucket policy and CORS correctly. **NOTE** to enable directory listing you'll need to add both the bucket and the bucket with the trailing `/*` into the resource section.

For example;


```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Resource": [
                "arn:aws:s3:::<bucketname>",
                "arn:aws:s3:::<bucketname>/*"
            ]
        }
    ]
}
```

And for CORS;

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
```

# Roadmap

* Expires index
* Versioning
* Indexing arrays and json object
* Test speed as indicies increase in size
* Sharding