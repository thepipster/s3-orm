"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = Column;
require("reflect-metadata");
const ModelMetaStore_1 = require("./ModelMetaStore");
const JsonType_1 = require("../columns/JsonType");
const ArrayType_1 = require("../columns/ArrayType");
const FloatType_1 = require("../columns/FloatType");
const IntegerType_1 = require("../columns/IntegerType");
const DateType_1 = require("../columns/DateType");
const BooleanType_1 = require("../columns/BooleanType");
const BaseType_1 = require("../columns/BaseType");
// any parameters, even optional ones!
function Column(params) {
    return function (target, propertyKey) {
        //const t = Reflect.getMetadata("design:type", target, propertyKey);
        var t = Reflect.getMetadata("design:type", target, propertyKey);
        //console.log(`${propertyKey} type: ${t.name}`);
        const className = target.constructor.name;
        //Logger.debug(className, propertyKey, params);
        // Handle case where we have no type passed in
        // and we look up type from member variable type
        const type = (params.type) ? params.type : t.name.toLowerCase();
        //Logger.debug(`Column type for ${className}.${propertyKey} is ${type}`);
        let isNumeric = false;
        if (type == 'number' || type == 'integer' || type == 'float' || type == 'date') {
            isNumeric = true;
        }
        const col = {
            name: propertyKey.trim(),
            type,
            isNumeric,
            index: (params === null || params === void 0 ? void 0 : params.index) || false,
            unique: (params === null || params === void 0 ? void 0 : params.unique) || false,
            default: params === null || params === void 0 ? void 0 : params.default,
            /*
            encode: (params.encode) ? params.encode : (val: any): string => {
                if (val === null || val === undefined) return '';
                if (type === 'json' || type === 'array') return JSON.stringify(val);
                if (val instanceof Date) return val.toISOString();
                return String(val);
            },
            decode: (params.decode) ? params.decode : (val: string): any => {
                if (!val) return null;
                if (type === 'json' || type === 'array') return JSON.parse(val);
                if (type === 'date') return new Date(val);
                if (isNumeric) return Number(val);
                return val;
            }
            */
        };
        //Logger.debug(`[${className}] Column schemd for ${propertyKey} (native type = ${t.name})`, col);
        if (params.encode && typeof params.encode == 'function') {
            col.encode = params.encode;
        }
        else {
            switch (type) {
                case 'json':
                    col.encode = JsonType_1.JsonType.encode;
                    break;
                case 'array':
                    col.encode = ArrayType_1.ArrayType.encode;
                    break;
                case 'integer':
                    col.encode = IntegerType_1.IntegerType.encode;
                    break;
                case 'number': // default a number to a float
                case 'float':
                    col.encode = FloatType_1.FloatType.encode;
                    break;
                case 'date':
                    col.encode = DateType_1.DateType.encode;
                    break;
                case 'boolean':
                    col.encode = BooleanType_1.BooleanType.encode;
                    break;
                default:
                    col.encode = BaseType_1.BaseType.encode;
            }
        }
        if (params.decode && typeof params.decode == 'function') {
            col.decode = params.decode;
        }
        else {
            switch (type) {
                case 'json':
                    col.decode = JsonType_1.JsonType.decode;
                    break;
                case 'array':
                    col.decode = ArrayType_1.ArrayType.decode;
                    break;
                case 'integer':
                    col.decode = IntegerType_1.IntegerType.decode;
                    break;
                case 'number': // default a number to a float
                case 'float':
                    col.decode = FloatType_1.FloatType.decode;
                    break;
                case 'date':
                    col.decode = DateType_1.DateType.decode;
                    break;
                case 'boolean':
                    col.decode = BooleanType_1.BooleanType.decode;
                    break;
                default:
                    col.decode = BaseType_1.BaseType.decode;
            }
        }
        // Register the column in ModelMetaStore
        //Logger.debug(`Registering column ${className}.${propertyKey} (${col.type})`, col );
        ModelMetaStore_1.ModelMetaStore.addColumn(className, col);
    };
}
//# sourceMappingURL=Column.js.map