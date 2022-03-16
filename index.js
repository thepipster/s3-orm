//import ClientEngine from "./engines/ClientEngine";
import Model from "./src/core/Model.js";
import Storm from "./src/core/Storm.js";
import Engine from "./src/core/Engine.js";

import IdType from './src/types/IdType.js';
import UuidType from'./src/types/UuidType.js';
import JsonType from'./src/types/JsonType.js';
import ArrayType from'./src/types/ArrayType.js';
import FloatType from'./src/types/FloatType.js';
import IntegerType from'./src/types/IntegerType.js';
import DateType from'./src/types/DateType.js';
import BooleanType from'./src/types/BooleanType.js';
import StringType from'./src/types/StringType.js';

const DataTypes = {
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
export {
    Engine,
    DataTypes,
    Model,
    Storm
}   
 