require("dotenv-safe").config({});
const Logger = require("./utils/logger");
const _ = require("lodash");

class QueryEngine {

    constructor(engineInstance){
        this.s3 = engineInstance;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////

    async max(fieldName){
        return  await this.s3.z(`indices/${this.modelName}/${fieldName}`, val);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////


}

module.exports = QueryEngine;
