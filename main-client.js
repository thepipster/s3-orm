
const IdType = require('./lib/types/IdType');
const UuidType = require('./lib/types/UuidType.js');
const JsonType = require('./lib/types/JsonType.js');
const ArrayType = require('./lib/types/ArrayType.js');
const FloatType = require('./lib/types/FloatType.js');
const IntegerType = require('./lib/types/IntegerType.js');
const DateType = require('./lib/types/DateType.js');
const BooleanType = require('./lib/types/BooleanType.js');
const StringType = require('./lib/types/StringType.js');

const Model = require('./lib/core/Model.js');
const ClientEngine = require('./lib/engines/ClientEngine.js');
const Storm = require('./lib/core/Storm.js');

const DateTypes = {
    Id: IdType,
    Uuid: UuidType,
    Json: JsonType,
    Float: FloatType,
    Number: IntegerType,
    Integer: IntegerType,
    String: StringType,
    Boolean: BooleanType,
    Array: ArrayType,
    Date: DateType
}

// Names exports
module.exports = {
    DateTypes,
    Model,
    ClientEngine,
    Storm
}   
 