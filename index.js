import IdType from './lib/types/IdType.js';
import UuidType from'./lib/types/UuidType.js';
import JsonType from'./lib/types/JsonType.js';
import ArrayType from'./lib/types/ArrayType.js';
import FloatType from'./lib/types/FloatType.js';
import IntegerType from'./lib/types/IntegerType.js';
import DateType from'./lib/types//DateType.js';
import BooleanType from'./lib/types/BooleanType.js';
import StringType from'./lib/types/StringType.js';  

import Model from "./lib/core/Model.js";
import Engine from "./lib/engines/Engine.js";
import ClientEngine from "./lib/engines/ClientEngine.js";
import Storm from "./lib/core/Storm.js";

// Names exports

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
};

export {
    DataTypes,
    Model,
    Engine,
    ClientEngine,
    Storm
};
   
 