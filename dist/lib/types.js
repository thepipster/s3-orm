"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Op = exports.StashDefaultConfig = void 0;
exports.StashDefaultConfig = {
    bucket: '',
    prefix: '',
    region: 'us-east-1',
    rootUrl: 's3orm/',
    accessKeyId: '',
    secretAccessKey: '',
    indexingEngine: 'basic',
    s3Client: undefined,
    sessionToken: undefined
};
var Op;
(function (Op) {
    Op["$gt"] = "$gt";
    Op["$gte"] = "$gte";
    Op["$lt"] = "$lt";
    Op["$lte"] = "$lte";
})(Op || (exports.Op = Op = {}));
//# sourceMappingURL=types.js.map