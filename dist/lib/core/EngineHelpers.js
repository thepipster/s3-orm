"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineHelpers = void 0;
const base64url_1 = __importDefault(require("base64url"));
const Logger_1 = __importDefault(require("../utils/Logger"));
class EngineHelpers {
    // ///////////////////////////////////////////////////////////////////////////////////////
    static encode(str) {
        if (typeof str != 'string') {
            Logger_1.default.error(`BaseS3Engine._encode() - ${str} is not a string, it is a ${typeof str}`);
            throw new Error(`${str} is not a string, it is a ${typeof str}`);
        }
        return (0, base64url_1.default)(str);
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static decode(hash) {
        if (typeof hash != 'string') {
            Logger_1.default.error(`BaseS3Engine._decode() - ${hash} is not a string, it is a ${typeof hash}`);
            throw new Error(`${hash} is not a string, it is a ${typeof hash}`);
        }
        return base64url_1.default.decode(hash);
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static getPath(prefix, setName, val) {
        return this.getKey(prefix, setName, val) + '/';
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static getKey(prefix, setName, val) {
        if (!setName) {
            return `${this.rootPath}${prefix}`;
        }
        if (!val) {
            return `${this.rootPath}${prefix}/${setName}`;
        }
        return `${this.rootPath}${prefix}/${setName}/${this.encode(val + '')}`;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static getKeyWithId(prefix, setName, val, id) {
        //const pad = "0000000";
        //const idStr = (pad+id).slice(-pad.length);    
        const idStr = id + '';
        return `${this.rootPath}${prefix}/${setName}/${this.encode(val + '')}###${idStr}`;
    }
    // ///////////////////////////////////////////////////////////////////////////////////////
    static getKeyWithScore(prefix, setName, val, score) {
        //const pad = "0000000";
        //const scoreStr = (pad+score).slice(-pad.length);            
        const scoreStr = score + '';
        return `${this.rootPath}${prefix}/${setName}/${scoreStr}###${this.encode(val + '')}`;
    }
}
exports.EngineHelpers = EngineHelpers;
EngineHelpers.rootPath = "s3orm/";
//# sourceMappingURL=EngineHelpers.js.map