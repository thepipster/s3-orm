//import ClientEngine from "./engines/ClientEngine";
import Model from "./lib/core/Model";
import Storm from "./lib/core/Storm";
import {AwsEngine, type AwsEngineOpts} from "./lib/core/AwsEngine";

import IdType from './lib/types/IdType';
import UuidType from'./lib/types/UuidType';
import JsonType from'./lib/types/JsonType';
import ArrayType from'./lib/types/ArrayType';
import FloatType from'./lib/types/FloatType';
import IntegerType from'./lib/types/IntegerType';
import DateType from'./lib/types/DateType';
import BooleanType from'./lib/types/BooleanType';
import StringType from'./lib/types/StringType';

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
    AwsEngine,
    DataTypes,
    Model,
    Storm
}   
 