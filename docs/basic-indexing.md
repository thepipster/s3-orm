# S3-ORM Basic Indexing System

## Overview

The S3-ORM basic indexing system provides efficient query capabilities on top of Amazon S3, which otherwise only supports basic key-value operations. The indexing system is implemented in the `BasicIndexing` class and implements the `IndexingEngine` interface, which creates and manages various types of indexes to enable fast lookups, range queries, and uniqueness constraints.

## Architecture

The indexing system is built on these key components:

1. **BasicIndexing Class**: Implements the `IndexingEngine` interface and provides methods for creating, updating, and querying indexes.

2. **Model Integration**: The `Model` class uses `BasicIndexing` (imported as `Indexing`) to automatically maintain indexes when model data changes.

3. **Schema Integration**: Uses `ModelMetaStore` to access schema information and validate fields before indexing.

4. **Storage Layer**: Uses the `Storm.s3()` interface to interact with Amazon S3 for all storage operations.

## S3 File structure

The basic indexing system stores indexes in S3 using the following structure:

- hash
   - `<modelName>` A directory for each model, containing the actual instance values
      - `<id>` A stringified JSON object of the model instance, filename beind the id of the model instance.  is stored 
- keyval
   - `<modelName>` A directory for each model containing the key-value indexes
      - `<fieldName>` A directory of indexes for each field
        - `<encoded-value>###<id>` The actual index value, with the id of the model instance
- sets
   - `<modelName>` A directory for each model containing indexes for non-numeric fields
      - `<fieldName>` A directory of indexes for each field
        - `<encoded-value>` The actual index value
- zsets
   - `<modelName>` A directory for each model containing indexes for numeric fields
      - `<fieldName>` A directory of indexes for each field
        - `<encoded-value>###<id>` The actual index value, with the id of the model instance


## Index Types

The system supports several types of indexes:

### 1. Basic String Indexes

Basic indexes store string values and their associated model IDs, enabling exact match and substring searches.

**Key Methods:**
- `add(fieldName, val)`: Adds a string value to the index
- `remove(fieldName, val)`: Removes a value from the index
- `list(fieldName)`: Lists all values in an index
- `search(fieldName, searchVal)`: Performs a case-insensitive substring search
- `clear(fieldName)`: Clears all values from an index

### 2. Unique Indexes

Unique indexes ensure that a field's value is unique across all model instances.

**Key Methods:**
- `addUnique(fieldName, val)`: Adds a unique value, throws `UniqueKeyViolationError` if already exists
- `removeUnique(fieldName, val)`: Removes a unique value
- `isMemberUniques(fieldName, val)`: Checks if a value exists in the unique index
- `getUniques(fieldName)`: Gets all unique values
- `clearUniques(fieldName)`: Clears all unique values

### 3. Numeric Indexes

Numeric indexes store numeric values in sorted order, enabling range queries and sorting.

**Key Methods:**
- `addNumeric(fieldName, val)`: Adds a numeric value to the index
- `removeNumeric(fieldName, val)`: Removes a numeric value
- `searchNumeric(fieldName, query)`: Performs range queries using operators ($gt, $lt, $gte, $lte)
- `getNumerics(fieldName)`: Gets all numeric values
- `clearNumerics(fieldName)`: Clears all numeric values

### 4. Expiration Indexes

Expiration indexes allow model instances to automatically expire after a specified time.

**Key Method:**
- `addExpires(expireTime)`: Sets an expiration time in seconds

## Implementation Details

### Index Naming Convention

Indexes are named using the pattern `${modelName}/${fieldName}`, making them easy to identify and organize in S3.

### ID Management

The system maintains a special index to track the maximum ID used for each model type:

- `setMaxId(id)`: Sets the maximum ID for a model
- `getMaxId()`: Gets the current maximum ID

This enables automatic ID assignment for new model instances.

### Index Maintenance

The system provides methods to maintain index integrity:

- `setIndexForField(key, val, oldVal)`: Updates indexes when a field value changes
- `removeIndexForField(key, val)`: Removes indexes for a field
- `cleanIndices()`: Rebuilds all indexes for a model to ensure consistency

## Usage Example

```typescript
// Creating an index for a model instance
const indexing = new BasicIndexing(modelId, 'User');

// Adding a unique index
await indexing.addUnique('email', 'user@example.com');

// Adding a numeric index
await indexing.addNumeric('age', 30);

// Searching with a numeric range query
const results = await indexing.searchNumeric('age', { $gte: 25, $lt: 40 });

// Setting an expiration
await indexing.addExpires(86400); // Expires in 24 hours
```

## Error Handling

The indexing system throws specific errors for various conditions:

- `UniqueKeyViolationError`: When attempting to add a duplicate value to a unique index
- `Error`: When a field doesn't exist in the schema or doesn't have indexing enabled

## Performance Considerations

1. **Batch Operations**: The system uses batch operations where possible to minimize API calls to S3
2. **Concurrency**: Uses Promise.map with concurrency limits for parallel operations
3. **Encoding**: Values are properly encoded before storage to ensure compatibility with S3 key constraints

## Integration with Model Layer

The Model class automatically maintains indexes when data changes:

1. When saving a model, it updates all indexed fields
2. When removing a model, it removes all associated indexes
3. When querying, it uses the appropriate index type based on the field and query