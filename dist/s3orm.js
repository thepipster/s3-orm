(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lodash'), require('bluebird'), require('chance'), require('uuid/v4'), require('aws-sdk'), require('base64url')) :
  typeof define === 'function' && define.amd ? define(['exports', 'lodash', 'bluebird', 'chance', 'uuid/v4', 'aws-sdk', 'base64url'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.s3orm = {}, global.lodash, global.Promise, global.Chance, global.uuidv4, global.AWS, global.base64url));
})(this, (function (exports, lodash, Promise$1, Chance, uuidv4, AWS, base64url) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Promise__default = /*#__PURE__*/_interopDefaultLegacy(Promise$1);
  var Chance__default = /*#__PURE__*/_interopDefaultLegacy(Chance);
  var uuidv4__default = /*#__PURE__*/_interopDefaultLegacy(uuidv4);
  var AWS__default = /*#__PURE__*/_interopDefaultLegacy(AWS);
  var base64url__default = /*#__PURE__*/_interopDefaultLegacy(base64url);

  const Logger = {

      levels: {
          'debug': 1,
          'info': 2,
          'warn': 3,
          'warning': 3,
          'error': 4,
          'fatal': 5
      },

      level: 1,

  	setLevel(lvl) {
  		Logger.level = Logger.levels[lvl];
  	},

  	log() {    
          if (Logger.level >= Logger.levels['debug']){
              console.log(...arguments);    
          }
  	},

  	debug() {                
          if (Logger.level >= Logger.levels['debug']){
              console.log(...arguments);    
          }
  	},

  	info() {          
          if (Logger.level >= Logger.levels['info']){
              console.info(...arguments);    
          }
    	},

  	warn() {
          if (Logger.level >= Logger.levels['warn']){
              console.warn(...arguments);    
          }
  	},

  	error() {
          if (Logger.level >= Logger.levels['error']){
              console.error(...arguments);    
          }
  	},

  	fatal() {
          if (Logger.level >= Logger.levels['fatal']){
              console.error(...arguments);    
          }
  	}     
  };

  /**
   * this is an error that can be thrown and results in a failure message back 
   * to the api (user error), but not treated internally as an error
   */
  class UniqueKeyViolationError extends Error {
      
      constructor(...args) {
          super(...args);
          this.code = 200;
          Error.captureStackTrace(this, UniqueKeyViolationError);
      }
  }

  /**
   * this is an error that can be thrown and results in a failure message back 
   * to the api (user error), but not treated internally as an error
   */
   class QueryError extends Error {
      
      constructor(...args) {
          super(...args);
          this.code = 401;
          Error.captureStackTrace(this, QueryError);
      }
  }

  class Indexing {

      constructor(id, modelName, schema, s3Engine){
          this.id = id;
          this.schema = schema;
          this.fields = Object.keys(schema);
          this.modelName = modelName;
          this.s3 = s3Engine;
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      _checkKey(key){
          //Logger.error(key, this.schema.hasOwnProperty(key));
          //Logger.error(Object.keys(this.schema));
          if (!(key in this.schema)){
              //Logger.error((key in this.fields), this.fields)
              throw new Error(`The schema does not have a field called ${key}!`);            
          }
          //const fieldDef = this.schema[key];
          if (!this.schema[key].index && !this.schema[key].unique){
              throw new Error(`The schema field ${key} does not have an index!`);            
          }
      }

      _isNull(val){
          return lodash.isNull(val) || lodash.isUndefined(val) || val == '';
      }

      stringify(key, val){
          this._checkKey(key);
          const fieldDef = this.schema[key];
          return (fieldDef.type) ? fieldDef.type.encode(val) : fieldDef.encode(val);
      }

      parse(key, val){
          this._checkKey(key);
          const fieldDef = this.schema[key];
          return (fieldDef.type) ? fieldDef.type.parse(val) : fieldDef.parse(val);
      }    

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * 
       * @param {*} fieldName 
       * @param {*} val 
       * @returns 
       */
      async isMemberUniques(fieldName, val){
          
          this._checkKey(fieldName);
          
          if (this._isNull(val)){
              throw new Error(`The value must be a string!`);
          }
          
          val = this.stringify(fieldName, val);
          const key = Indexing.getIndexName(this.modelName, fieldName);

          let alreadyExistsId = await this.s3.setIsMember(key, val);

          // Throw error if this val already exists in the set
          if (alreadyExistsId && alreadyExistsId != this.id) {
              return true;
          }

          return false;

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async clearUniques(fieldName){
          this._checkKey(fieldName);
          return await this.s3.setClear(Indexing.getIndexName(this.modelName, fieldName));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async getUniques(fieldName){
          this._checkKey(fieldName);
          return await this.s3.setMembers(Indexing.getIndexName(this.modelName, fieldName));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async removeUnique(fieldName, val){
          this._checkKey(fieldName);
          val = this.stringify(fieldName, val);
          await this.s3.setRemove(Indexing.getIndexName(this.modelName, fieldName), val);
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async addUnique(fieldName, val){

          if (typeof val != 'string'){
              throw new Error(`Can't add an empty non-string value!`);
          }

          this._checkKey(fieldName);

          val = this.stringify(fieldName, val);
          const key = Indexing.getIndexName(this.modelName, fieldName);

          let alreadyExistsId = await this.s3.setIsMember(key, val);

          // Throw error if this val already exists in the set
          if (alreadyExistsId && alreadyExistsId != this.id) {
              throw new UniqueKeyViolationError(`${fieldName} = ${val} is unique, and already exists`);
          }

          //return await this.add(fieldName, val);
          await this.s3.setAdd(Indexing.getIndexName(this.modelName, fieldName), val);
          return
      }
      

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Remove a simple index
       * @param {*} fieldName 
       * @param {*} val 
       */
      async remove(fieldName, val){
          if (this._isNull(val)){
              return;
          }       
          this._checkKey(fieldName); 
          val = this.stringify(fieldName, val);
          const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${this.s3._encode(val)}###${this.id}`;
          await this.s3.del(key);  
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Add a simple index for a value
       * @param {*} fieldName 
       * @param {*} val 
       */
      async add(fieldName, val){
          if (this._isNull(val)){
              return;
          }        
          this._checkKey(fieldName);        
          val = this.stringify(fieldName, val);
          const key = `${Indexing.getIndexName(this.modelName, fieldName)}/${this.s3._encode(val)}###${this.id}`;
          await this.s3.set(key, val);  
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Get all the basic (string) index values for the given fieldName
       * @param {*} fieldName 
       * @returns 
       */
      async list(fieldName){                        
          this._checkKey(fieldName);
          let res = await this.s3.list(Indexing.getIndexName(this.modelName, fieldName));
          return lodash.map(res, (item)=>{
              let parts = item.split('###');
              return {
                  val: this.parse(fieldName, this.s3._decode(parts[0])), 
                  id: parseInt(parts[1])
              }            
          });
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Clear the entire index for the given fieldName
       * @param {*} fieldName 
       * @returns Number of items removed
       */
      async clear(fieldName){

          this._checkKey(fieldName);     
          let deleteBatch = [];
          let res = await this.list(fieldName);
                  
          for (let i=0; i<res.length; i+=1){             
              let item = res[i];
              let key = `${Indexing.getIndexName(this.modelName, fieldName)}/${this.s3._encode(item.val)}###${item.id}`;
              deleteBatch.push(key);            
          }

          await this.s3.delBatch(deleteBatch);

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Perform a search on a basic (string) index
       * @param {*} fieldName 
       * @param {*} searchVal 
       * @returns 
       */
      async search(fieldName, searchVal, options){        
          
          this._checkKey(fieldName);
          /*
          function equalsIgnoringCase(text, other) {
              if (!text){
                  return false;
              }
              let test = text.localeCompare(other, undefined, { sensitivity: 'base' }) === 0;
              Logger.debug(`search() Comparing ${text} against ${other} -- match = ${test}`)

          }
          */

          searchVal = this.stringify(fieldName, searchVal);

          if (!searchVal || typeof searchVal != 'string'){
              Logger.warn(`Indexing.sarch() ${fieldName} = ${searchVal} is not a string`);
              return;
          }

          searchVal = searchVal.toLowerCase();
          let res = await this.list(fieldName);
          
          let list = [];

          lodash.map(res, (item)=>{
              if (item.val){
                  //Logger.debug(`search() Comparing ${item.val} against ${searchVal} -- match = ${test}`)
                  //if (equalsIgnoringCase(item.val, searchVal)){
                  if (item.val.toLowerCase().includes(searchVal)){
                      list.push(item.id);
                  }    
              }
          });

          return lodash.uniq(list);
      }          

      // ///////////////////////////////////////////////////////////////////////////////////////

      async getNumerics(fieldName){
          this._checkKey(fieldName);
          return await this.s3.zSetMembers(Indexing.getIndexName(this.modelName, fieldName), true);
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async clearNumerics(fieldName){
          this._checkKey(fieldName);
          return await this.s3.zSetClear(Indexing.getIndexName(this.modelName, fieldName));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async addNumeric(fieldName, val){
          if (this._isNull(val)){
              return;
          }          
          this._checkKey(fieldName);
          val = this.stringify(fieldName, val);
          // Stuff the id into the index as a meta value
          try {
              await this.s3.zSetAdd(Indexing.getIndexName(this.modelName, fieldName), val, this.id+'');
          }
          catch(err){
              Logger.error(err);
              throw new Error(`Error setting numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`);
          }
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async removeNumeric(fieldName, val){
          if (this._isNull(val)){
              return;
          }          
          this._checkKey(fieldName);
          val = this.stringify(fieldName, val);
          try {
              await this.s3.zSetRemove(Indexing.getIndexName(this.modelName, fieldName), val+'', this.id+'');
          }
          catch(err){
              throw new Error(`Error removing numeric index for field ${fieldName}, val = ${val} and id = ${this.id}`, err.toString());
          }        
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Search on a numeric index, returning an array of id's that match the query
       * @param {string} fieldName 
       * @param {object} query gt, gte, lt, lte, limit, order (ASC or DESC), scores
       * @returns 
       */
      async searchNumeric(fieldName, query){
          this._checkKey(fieldName);
          let res = await this.s3.zRange(Indexing.getIndexName(this.modelName, fieldName), query);
          if (!res){
              return [];
          }
          return lodash.map(res, (item)=>{
              return parseInt(item);
          });
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static getIndexName(modelName, fieldName){
          return `${modelName}/${fieldName}`;
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * As tracking the last id used for models is used a lot (when we create a new model instance)
       * it makes sense to cache id's as a special case
       * @param {*} modelName 
       */
      async setMaxId(id){
          await this.s3.set(`${this.modelName}/maxid`, id+'');
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async getMaxId(){
          try {
              let val = await this.s3.get(`${this.modelName}/maxid`);
              let no = parseInt(val);
              //Logger.debug(`getMaxId() = Read ${val}, parsed = ${no}, isNumber(no) = ${isNumber(no)}, isFinite(no) = ${isFinite(no)}`);
              if (!lodash.isNumber(no) || !lodash.isFinite(no)){
                  return 0;
              }
              return no;
          }
          catch(err){
              //Logger.error(err);
              return 0;
          }
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async removeIndexForField(key, val){
          
          const fieldDef = this.schema[key];

          // If this field is not indexed, just return now
          if (!fieldDef.index && !fieldDef.unique){
              return;
          }

          const isNull = this._isNull(val);        

          
          //Logger.info(`Removing index for ${chalk.cyan(key)};
          //    val ${val},
          //    isNull ${isNull},
          //    unique ${chalk.blueBright(fieldDef.unique)},
          //    isNumeric ${chalk.blueBright(fieldDef.type.isNumeric)},
          //    isInDb ${chalk.blueBright(fieldDef.isInDb)},
          //    index ${chalk.blueBright(fieldDef.index)},
          //`);
          

          if (isNull){
              return;
          }

          try {
              
              if (fieldDef.unique) {
                  await this.removeUnique(key, val);
              }
                              
              if (fieldDef.type.isNumeric) {
                  await this.removeNumeric(key, val);
              }
              else {
                  await this.remove(key, val);                
              }
      
          }
          catch(err){
              /*
              Logger.error(`Error removing index for ${chalk.cyan(key)};
                  val ${val},
                  isNull ${isNull},
                  unique ${chalk.blueBright(fieldDef.unique)},
                  isNumeric ${chalk.blueBright(fieldDef.type.isNumeric)},
                  isInDb ${chalk.blueBright(fieldDef.isInDb)},
                  index ${chalk.blueBright(fieldDef.index)},
              `);
              */
              Logger.error(err);
              //process.exit(1);
              throw err;
      
          }

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async setIndexForField(key, val, oldVal){
          
          const fieldDef = this.schema[key];

          // If this field is not indexed, just return now
          if (!fieldDef.index && !fieldDef.unique){
              return;
          }

          if (!this.id){
              throw new Error(`The id has not been set, can not index without it!`);
          }
          
          const isNull = this._isNull(val);
          const isInDb = !this._isNull(oldVal);
          const isDirty = !isInDb || (val !== oldVal);

          // If it's not dirty (unchanged), then nothing to be done
          if (!isDirty){
              //Logger.info(`Skipping index for ${chalk.cyan(key)} (it's not dirty)`);
              return;
          }

          await this.removeIndexForField(key, oldVal);

          if (isNull){
              return;
          }

          /*                
          Logger.info(`Setting index for ${chalk.cyan(key)};
              val ${val},
              oldVal ${oldVal},
              unique ${chalk.blueBright(fieldDef.unique)},
              isNull ${isNull},
              isNumeric ${chalk.blueBright(fieldDef.type.isNumeric)},
              isInDb ${chalk.blueBright(fieldDef.isInDb)},
              index ${chalk.blueBright(fieldDef.index)},
          `);
          */

          if (fieldDef.unique) {
              //await this.addUnique(key, val);
              // If the index is unique, and already exists, return            
              await this.addUnique(key, val);
          }                

          if (fieldDef.type.isNumeric && !isNull) {
              await this.addNumeric(key, val);
          }
          else {
              await this.add(key, val);
          }

    


      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Loop through the indices for this model, and reset. That is, make
       * sure they are correct and aren't corrupt
       */
      async cleanIndices() {

          // List all objects from their hashes
          let keys = await this.s3.listObjects(this.modelName);

          // Clean all the indexes for this  model
          await this.s3.zSetClear(this.modelName);
          await this.s3.setClear(this.modelName);

          // Get basic indexes
          let fieldNames = Object.keys(this.schema);
          let deleteBatch = [];
          
          for (let i=0; i<keys.length; i+=1){ 
              
              keys[i];
              
              //Logger.debug(`Deleting ${key} (${i+1} of ${keys.length})`);

              await Promise__default["default"].map(fieldNames, async (fieldName) => {
                  let res = await this.s3.list(Indexing.getIndexName(this.modelName, fieldName));
                  for (let k=0; k<res.length; k+=1){
                      const item = res[k];
                      const dkey = `${Indexing.getIndexName(this.modelName, fieldName)}/${item}`;
                      deleteBatch.push(dkey);
                  }
              }, {concurrency: 10});

          }

          await this.s3.delBatch(deleteBatch);


          // TODO: Explore, to make faster...
          // this.s3.aws.deleteAll(items);
          let maxId = -9999;

          await Promise__default["default"].map(keys, async (key) => {                    
              
              let data = await this.s3.getObject(key);
              
              if (data.id > maxId){
                  maxId = data.id;
              }

              // Set new indexes
              for (let j=0; j<fieldNames.length; j+=1){
                  let fieldName = fieldNames[j];
                  this.id = data.id;
                  this.setIndexForField(fieldName, this.schema[fieldName], data[fieldName], null);
              }

          }, {concurrency: 10}); 

          // Set max id correctly
          await this.setMaxId(maxId);

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Add a expire index, that will expire the entire model instance
       * @param {integer} expireTime Seconds in the future that this will expire
       */
       async addExpires(expireTime){
          let expires = Math.round(Date.now() / 1000) + expireTime;
          await this.s3.zSetAdd(`${this.modelName}/expires`, expires+'', this.id+'', this.id+'');
      }
      
      // ///////////////////////////////////////////////////////////////////////////////////////
  }

  /**
   * Base Redis models, based on Nohm (https://maritz.github.io/nohm/)
   */
  class BaseModel {
      
      /**
       * Base constructor. The model should be like;
       *
       *  [
       *      id: {type:'number', index:true},
       *      noUsersInGame: {type:'number', defaultValue:0},
       *      noUsers: {type:'number', defaultValue:0},
       *      isStarted: {type:'number', defaultValue: 0},
       *      startTime: {type: 'date', defaultValue: ()=>{return Date.now()}}
       *      currentQuestionId: {type:'number', defaultValue: 0},
       *      questionIds: {type:'array', default: []}
       *  ]
       *
       * @param {object} data The initial data, e.g. {id:0}
       * @param {object} prefix The prefix, e.g. 'game:'
       * @param {object} model The model
       */
      constructor(data) {

          if (!data){
              data = {};
          }

          // Grab model and prefix from the child static methods
          // NOTE: static methods are just methods on the class constructor
          const model = this.constructor._schema();
          //this.s3 = this.constructor.s3;
          
          if (model) {
              for (let key in model) {

                  var item = model[key];
                  (model[key].type) ? model[key].type : model[key];

                  try {
                      
                      if (!lodash.isUndefined(data[key])) {
                          //this[key] = data[key];
                          this[key] = data[key];
                          //this[key] = BaseModelHelper.parseItem(model[key], data[key])
                      } 
                      else if (!lodash.isUndefined(item.defaultValue)) {
                          if (typeof item.defaultValue == "function") {
                              this[key] = item.defaultValue();
                          } 
                          else {
                              this[key] = item.defaultValue;
                          }
                      } 
                      else if (!lodash.isUndefined(item.default)) {
                          this[key] = item.default;
                      } 
                      else {
                          //Logger.error(`${key} is not defined: ${data[key]}`)
                          this[key] = null;
                      }
      
                      //Logger.info(`${chalk.cyan(key)} of type ${chalk.blueBright(defn.name)} = ${chalk.green(data[key])} (${typeof data[key]})`);
      
                  }
                  catch(err){
                      Logger.error(item, data[key]);
                      Logger.error(`Error setting data in constructor`, err.toString());
                      process.exit(1);
                  }

              }

              if (data.id) {
                  this.id = data.id;
              }
          }

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      toJson(){
          
          var model = this.constructor._schema();
          let item = {};

          for (var key in model) {
              if (key in this && typeof this[key] != "undefined") {
                  item[key] = this[key];
              }
          }

          return item;
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static async resetIndex(){
          const modelName = this._name();
          const model = this._schema();        
          const indx = new Indexing(null, modelName, model, this.s3);
          await indx.cleanIndices();
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Return true if a model exists with this id
       * @param {string} id
       */
      static async exists(id) {
          const modelName = this._name();        
          return await this.s3.hasObject(`${modelName}/${id}`);
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static async max(fieldName){
          const model = this._schema();
          const type = (model[fieldName].type) ? model[fieldName].type : model[fieldName];
          const modelName = this._name();        
          if (!type.isNumeric){
              throw new QueryError(`${modelName}.${fieldName} is not numeric!`);
          }
          return await this.s3.zGetMax(`${modelName}/${fieldName}`, false);
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static async count(query) {
          let docIds = await this.getIds(query);
          return docIds.length;
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static async distinct(field, query) {
          // TODO: speed up. This is slow as it requires loading
          // all docs then extracting the required field...
          let docs = await this.find(query);
          return lodash.uniq(lodash.map(docs, field));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////
      
      /**
       * Delete this document from redis, and clear it out from any indices
       */
      async remove() {
          //Logger.info(`Removing ${this.id}`)

          if (!this.id) {
              throw new Error(`Trying to remove document without an id!`);
          }

          const s3 = this.constructor.s3;
          const modelName = this.constructor._name();
          const model = this.constructor._schema();
          const indx = new Indexing(this.id, modelName, model, s3);


          for (let key in model) {
              //Logger.debug(`[${chalk.green(modelName)}] deleting index for ${chalk.yellow(key)}, val = ${this[key]}`);
              await indx.removeIndexForField(key, this[key]);
          }
          
          // Remove data
          await s3.delObject(`${modelName}/${this.id}`);

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Delete a document from redis, and clear it out from any indices
       * @param {string} id The id of the document to delete
       */
      static async remove(id) {
          //Logger.info(`Removing ${id}`)

          if (!id) {
              throw new Error(`Trying to remove document without an id!`);
          }

          let doc = await this.loadFromId(id);

          if (doc) {
              await doc.remove();
          }

          return;
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async save() {

          const modelName = this.constructor._name();
          const opts = this.constructor._opts();
          const model = this.constructor._schema();        
          const s3 = this.constructor.s3;
          const indx = new Indexing(this.id, modelName, model, s3);
          var oldValues = {};

          if (this.id){
              try {
                  oldValues = await this.constructor.loadFromId(this.id);
              }
              catch(err){
                  // Logger.warn(err);
              }
              if (!oldValues){
                  oldValues = {};
              }
          }
          else {
              // We need to set the id! So get the highest id in use for this model
              let maxId = await indx.getMaxId();
              //Logger.debug(`[${chalk.green(modelName)}] maxId = ${maxId} (${typeof maxId})`);
              this.id = maxId + 1;
              await indx.setMaxId(this.id);
          }
      
          //Logger.debug(`Saving ${modelName} ${this.id}`)

          var keys = [];

          for (var key in model) {
              if (key in this && typeof this[key] != "undefined") {
                  keys.push(key);
              }
          }  

          await Promise__default["default"].map(keys, async (key)=>{

              const defn = model[key];
              const val = this[key];   

              //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${val}`);

              // Check if this key is unique and already exists (if so, throw an error)
              if (defn.unique) {                    
                  //Logger.debug(`Checking if ${chalk.green(modelName)}.${chalk.yellow(key)} is unique, val = ${val}`);
                  let alreadyExists = await indx.isMemberUniques(key, val);    
                  if (alreadyExists) {
                      throw new UniqueKeyViolationError(`Could not save as ${key} = ${val} is unique, and already exists`);
                  }
              }

              
              //Logger.debug(`${chalk.green(modelName)}.${chalk.yellow(key)}]data[key] = ${data[key]}`);
              
              if (typeof defn.onUpdateOverride == "function") {
                  this[key] = defn.onUpdateOverride();
              }
                         

          });

          //
          // Write data to S3
          //

          //Logger.debug(`[${chalk.greenBright(modelName)}] Saving object ${this.id} to ${modelName}/${this.id}`);
          await s3.setObject(`${modelName}/${this.id}`, this);

          //
          // Setup indexes...
          //

          // Update the index with the id (which it needs to set the correct path for indexes!)
          indx.id = this.id;

          //Logger.debug(`[${chalk.greenBright(modelName)}] Setting up indexes for instance ${this.id}`);
      
          await Promise__default["default"].map(keys, async (key)=>{
              
              try {
                  //Logger.debug(`[${chalk.green(modelName)}.${chalk.yellow(key)}] val = ${this[key]}, prevVal = ${oldValues[key]}`);
                  await indx.setIndexForField(key, this[key], oldValues[key]);
              } 
              catch (err) {
                  if (err instanceof UniqueKeyViolationError) {
                      // Let this error bubble up, don't catch here
                      //Logger.error('UniqueKeyViolationError error')
                      throw err;
                  }
                  Logger.error('key = ', key);
                  Logger.error('data = ', this);
                  Logger.error('oldValues = ', oldValues);
                  Logger.error(err.toString());
                  process.exit(1);
              }


          }, {concurrency:1});

          //Logger.debug(`[${chalk.greenBright(modelName)}] done setting indexes`);

          // If this item expires, add to the expires index
          if (opts && opts.expires) {  
              //Logger.debug(`[${chalk.greenBright(modelName)}] Setting expires`);
              await indx.addExpires(opts.expires);
          }

          // Finally, expire anything that needs
          // TODO: test expires
          //await indx.clearExpireIndices();

          return this;


      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static async loadFromId(id) {
          try {

              const modelName = this._name();
              const key = `${modelName}/${id}`;
              const data = await this.s3.getObject(key);
              return new this(data);

          } catch (err) {
              Logger.warn(`[${this._name()}] Error with loadFromId(), id = ${id}`);
              //Logger.error(err);
              return null;
          }
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      static async findOne(query, options) {
          try {
              let docIds = await this.getIds(query, options);

              if (docIds.length == 0) {
                  return null;
              }

              return await this.loadFromId(docIds[0]);
          } catch (err) {
              Logger.error(`[${this._name()}] Error with findOne(), query = `, query);
              Logger.error(err);
              return [];
          }
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Perform a query. Supports simple and compound queries, plus ranges and limits;
       * For example, a range;
       *
       *      aFloat: {
       *           min: 15.0,
       *           max: 22.0
       *       }
       *
       * A range with a limit;
       *
       *       aFloat: {
       *           min: 15.0,
       *           max: 22.0,
       *           limit: 1,
       *           offset: 1
       *       }
       *
       * @param {*} query The query, e.g. {name:'fred'} or {name:'fred', age:25}. Note that
       * query keys must be indexed fields in the schema.
       */
      static async find(query, options) {

          try {
              
              let docIds = await this.getIds(query, options);

              if (docIds.length == 0) {
                  return [];
              }

              return await Promise__default["default"].map(docIds, async (docId) => {
                  try {
                      return await this.loadFromId(docId);
                  } catch (e) {
                      return null;
                  }
              });
          } catch (err) {
              Logger.error(`[${this._name()}] Error with find(), query = `, query);
              Logger.error(err);
              return [];
          }
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Get a list of id's based on the query and options
       * @param {*} query Support for; gt, gte, lt, lte
       * @param {*} options Support for; limit, offset, order (ASC or DESC), 
       * @returns 
       */
      static async getIds(query, options) {
          
          const modelName = this._name();
          const model = this._schema();
          const indx = new Indexing(null, modelName, model, this.s3);
          var queryParts = [];
          var results = [];

          // Set up any default options
          if (!options){
              options = {
                  offset: 0,
                  limit: 1000
              };
          }
          options.order = (options.order) ? options.order : 'ASC';

          // Deal with the special case of an empty query, which means return everything!
          if (lodash.isEmpty(query)){

              const list = await this.s3.listObjects(modelName);
              
              for (let i=0; i<list.length; i+=1){
                  let key = list[i];
                  let data = await this.s3.getObject(key);
                  results.push(data.id);
              }
                  
              return results;
          }


          //Logger.debug('query = ', query);

          // Convert query into a flat array for easy parsing

          for (let key in query){

              const defn = model[key];
              var qry = {
                  key, 
                  type: 'basic',
                  value: query[key]
              };

              if (defn.type.isNumeric) {
                  qry.type = 'numeric';
                  qry.order = options.order;
              }
              else if (defn.isUnique) {
                  qry.type = 'unique';
              }

              queryParts.push(qry);
          }

          //Logger.debug('queryParts = ', queryParts);

          // Now process each part of the query...

          await Promise__default["default"].map(queryParts, async (qry) => {
              if (qry.type == 'numeric'){
                  if (typeof qry.value == 'number'){
                      qry.value = {$gte: qry.value, $lte: qry.value};
                  }
                  results.push(await indx.searchNumeric(qry.key, qry.value));
              }
              else if (qry.type == 'basic'){
                  results.push(await indx.search(qry.key, qry.value));
              }
              else if (qry.type == 'unique'){
                  results.push(await indx.search(qry.key, qry.value));
              }
          
          });

          // And get the intersaction of all the results

          let inter = lodash.intersection(...results);

          // Support paging
          if (options.offset){
              inter = lodash.slice(inter, options.offset);
          }
          if (options.limit){
              inter = lodash.slice(inter, 0, options.limit);
          }

          //Logger.debug(results);
          //Logger.info(inter);

          return inter;

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Generate random sample data for this class
       */
      static generateMock() {

          const model = this._schema();        

          let mocked = new this();

          for (var key in model) {
              //keys.push(key);
              //Logger.warn(model[key].type);
              if (model[key].type){
                  mocked[key] = model[key].type.mock();
              }
              else if (model[key].mock){
                  mocked[key] = model[key].mock();
              }
          }  

          return mocked;

      }


  }

  class BaseType {
      
      constructor(name, isNumeric){
          this.name = name;
          this.isNumeric = isNumeric;
          this.encodedMarker = '';
      }
      
      mock(){
          return null;
      }
      

      parse(val){
          if (typeof val != 'string'){
              throw new Error(`Can not parse a non-string value!`);
          }
          if  (lodash.isNull(val) || lodash.isUndefined(val) || val == ''){
              return null;
          }
          //val = this._uncleanString(val);
          if (this.parseExtended){
              val = this.parseExtended(val);  
          }
          return val;
      }

      encode(val){
                  
          //if (typeof val == 'string' && this._isEncoded(val)){
          //    return val;
          //}

          if (this.encodeExtended){
              val = this.encodeExtended(val);
          }
          return this._cleanString(val); 
      }

      /**
       * Check to see if the data is already encoded
       * @param {*} str 
       */
      //_isEncoded(str){
      //    if (str.slice(0, this.encodedMarker.length) == this.encodedMarker){
      //        return true;
      //    }
      //    return false;
      //}

      /**
       * Remove any generic markers, such as encoded marker
       * @param {*} str 
       */
      _uncleanString(str){
          return str.slice(this.encodedMarker.length);
      }

      /**
       * Deal with null or undefined values that got encoded and mark as encoded
       * to avoid double encoding bugs
       * @param {*} str 
       * @returns 
       */
      _cleanString(str){
          if (!str || str == 'null' || str == 'undefined'){
              return '';
          }
          return str;
      }
  /*
      sleep(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
      },


      */
  }

  const chance$7 = new Chance__default["default"]();

  class IdType extends BaseType {
      constructor(){
          super('id', true);
      }    
      mock(){ 
          return chance$7.integer({ min: 1, max: 20000 })
      }
      encodeExtended(val){
          return val+'';
      }
      parseExtended(val){ 
          let no = parseInt(val);
          if (lodash.isFinite(no)){
              return no
          }
          return null;
      }
  }

  var IdType$1 = new IdType();

  class UuidType extends BaseType {
      
      constructor(){
          super('uuid', false);
      }    
      
      mock(){ 
          return this.generateToken();
      }
      
      /**
       * Generate a token for use as a secret key, nonce etc.
       * @param length (optional) specify length, defaults to 24;
       * @return {string}
       */
       generateToken(length=24) {

          let token = uuidv4__default["default"]().replace(/-/g,'');

          while (token.length < length){
              token += uuidv4__default["default"]().replace(/-/g,'');
          }

          return token.substr(0,length)

      }            
  }

  var UuidType$1 = new UuidType();

  const chance$6 = new Chance__default["default"]();

  class JsonType extends BaseType {
      constructor(){
          super('json', false);
      }    
      mock(){ 
          return {
              a: chance$6.integer({ min: -200, max: 200 }),
              b: chance$6.name(),
              c: chance$6.d100(),
              d: chance$6.floating({ min: 0, max: 1000})    
          }
      }
      parseExtended(val){ 
          try {
              return JSON.parse(val);
          }
          catch(err){
              Logger.error(`Error decoding json string ${val}`);
          }
          return null
      }
      encodeExtended(val){         
          return JSON.stringify(val);
      }        
  }

  var JsonType$1 = new JsonType();

  class ArrayType extends BaseType {
      constructor(){
          super('array', false);
      }    
      mock(){ 
          return chance.n(chance.word, 5);
      }
      parseExtended(val){ 
          try {
              return JSON.parse(val);
          }
          catch(err){
              Logger.error(`Error decoding json string ${val}`);
          }
          return null
      }
      encodeExtended(val){         
          return JSON.stringify(val);
      }   
  }

  var ArrayType$1 = new ArrayType();

  const chance$5 = new Chance__default["default"]();

  class FloatType extends BaseType {
      constructor(){
          super('float', true);
      }    
      mock(){ 
          return chance$5.floating({ min: 0, max: 1000000});
      }
      encodeExtended(val){
          return val+'';
      }
      parseExtended(val){ 
          let flno = parseFloat(val);
          if (lodash.isFinite(flno)){
              return flno;
          }
          return null;
      }
  }

  var FloatType$1 = new FloatType();

  const chance$4 = new Chance__default["default"]();

  class IntegerType extends BaseType {
      constructor(){
          super('integer', true);
      }    
      mock(){ 
          return chance$4.integer({ min: -20000, max: 20000 });
      }
      encodeExtended(val){
          return val+'';
      }
      parseExtended(val){ 
          let flno = parseInt(val);
          if (lodash.isFinite(flno)){
              return flno;
          }
          return null;
      }
  }

  var IntegerType$1 = new IntegerType();

  const chance$3 = new Chance__default["default"]();

  class DateType extends BaseType {
      constructor(){
          super('date', true);
      }    
      mock(){ 
          return chance$3.date();
      }
      parseExtended(val){ 
          let epoch = parseInt(val);
          if (lodash.isFinite(epoch)){
              return new Date(epoch)
          }
          return null;
      }
      encodeExtended(val){         
          if (!val){
              return '0'
          }            
          return new Date(val).getTime()+'';     
      }   
  }

  var DateType$1 = new DateType();

  const chance$2 = new Chance__default["default"]();

  class BooleanType extends BaseType {
      constructor(){
          super('boolean', false);
      }    
      mock(){ 
          return chance$2.bool();
      }
      encodeExtended(val){
          if (val == 'true'){
              return '1';
          }
          else if (val == 'false'){
              return '0';
          }
          else if (val == ''){
              return '0';
          }
          return (val) ? '1' : '0';
      }
      parseExtended(val){ 
          if (val == 1 || val == '1'){
              return true;
          }
          return false;
      }
  }

  var BooleanType$1 = new BooleanType();

  const chance$1 = new Chance__default["default"]();

  class StringType extends BaseType {
      constructor(){
          super('string', false);
      }    
      mock(){ 
          return chance$1.sentence({words: lodash.random(1,20)});
      }
  }

  var StringType$1 = new StringType();

  // Names exports
  var DataTypes$1 = {
      Id: IdType$1,
      Uuid: UuidType$1,
      Json: JsonType$1,
      Float: FloatType$1,
      Number: IntegerType$1,
      Integer: IntegerType$1,
      String: StringType$1,
      Boolean: BooleanType$1,
      Array: ArrayType$1,
      Date: DateType$1
  };

  /**
   * this is an error that can be thrown and results in a failure message back 
   * to the api (user error), but not treated internally as an error
   */
  class AuthError extends Error {
      
      constructor(...args) {
          super(...args);
          this.code = 401;
          Error.captureStackTrace(this, AuthError);
      }
  }

  /**
   * Class to simplify working with Amazon services
   */
  class S3Helper {

      /**
       * 
       * @param {*} opts {bucket,region,accessKeyId,secretAccessKey }
       */
      constructor(opts){

          if (!opts){
              throw new Error('You must pass configuration settings!');
          }

          // Make sure we have the settings we need
          if (!opts.bucket){
              throw new Error('No AWS Bucket specified!')
          }

          opts.region = (opts.region) ? opts.region : "us-east-1";
          opts.baseUrl = (opts.rootUrl) ? opts.rootUrl : `https://${opts.bucket}.s3.amazonaws.com`;
          opts.acl = (opts && opts.acl) ? opts.acl : 'private';
          
          this.opts = opts;
          this.authenticated = false;

          // If we have the credentials, try to authenticate
          if (opts.accessKeyId && opts.secretAccessKey){
              // init aws
              try {
                  //console.log('AWS opts = ', this.opts)
                  AWS__default["default"].config.update(this.opts);
                  this.authenticated = true;
              }
              catch(err){
                  console.error(err);
                  this.authenticated = false;
              }

          }

          this.s3 = new AWS__default["default"].S3({});

      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      getBucket(){ return this.opts.bucket }
      getRegion(){ return this.opts.region }
      getUrl(key){ 
          key = key.replace(/^\//, '');
          return `${this.opts.baseUrl}/${key}` 
      }

      // ///////////////////////////////////////////////////////////////////////////////////////////
      //
      // Anonymous
      //
      // ///////////////////////////////////////////////////////////////////////////////////////////

      _read(cmd, params){

          return new Promise((resolve, reject) => {     

              if (this.authenticated){
                  this.s3[cmd](params, function(err, data) {
                      if (err) {
                          resolve(err);
                      }
                      else {
                          resolve(data);
                      }
                  });
              }  
              else {
                  this.s3.makeUnauthenticatedRequest(cmd, params, function(err, data) {
                      if (err) {
                          resolve(err);
                      }
                      else {
                          resolve(data);
                      }
                  });
              }

          })   

      }

      _write(cmd, params){

          return new Promise((resolve, reject) => {     

              if (!this.authenticated){
                  throw new AuthError(`You need to be authenticated to call ${cmd}`);
              }  

              this.s3[cmd](params, function(err, data) {
                  if (err) {
                      resolve(err);
                  }
                  else {
                      resolve(data);
                  }
              });

          })   

      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
       * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
       * @param {*} directoryKey 
       * @returns 
       */
       async list(directoryKey) {

          const params = {
              Delimiter: '/',
              //EncodingType: 'url',
              //Marker: 'STRING_VALUE',
              //MaxKeys: 0,
              Prefix: directoryKey,
              Bucket: this.opts.bucket
          };

          let data = await this._read('listObjectsV2', params);
          return data.Contents;
   
      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
      * Check that a file exists
      * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property
      */
      async exists(key){

          const params = {
              Key: key,
              Bucket: this.opts.bucket
          };

          try {
              await this._read('headObject', params);
              return true;
          }
          catch(err){
              return false;
          }
   
      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
      * Get a file
      * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
      */
      async get(key) {
          Logger.debug('get = ', key);
          let data = await this._read('getObject', { Bucket: this.opts.bucket, Key: key });
          Logger.debug('data = ', data);
          return data.Body.toString('utf-8');
      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      async getObjectACL(key){

          const params = {
              Bucket: this.opts.bucket,
              //GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers", 
              Key: key
          };

          let data = await this._read('getObjectACL', params);
          return data.Contents;
      }
      
      // ///////////////////////////////////////////////////////////////////////////////////////////
      //
      // Authenticated
      //
      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Get a signed URL to a resource on S3
       * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
       */
      async getSignedUrl(key) {

          return new Promise((resolve, reject) => {            
              this.s3.getSignedUrl('getObject', {Bucket: this.opts.bucket, Key: key}, (err, obj)=>{
                  if (err){
                      return reject(err)
                  }
                  return resolve(obj)
              });
          })  

      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
       * 
       * @param {*} key 
       * @param {string} acl private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
       */
      async setObjectACL(key, acl){

          const params = {
              //ACL: acl,
              Bucket: this.opts.bucket,
              GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers", 
              Key: key
          };

          return await this._write('putObjectAcl', params);

      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Upload a file to AWS, using multipart upload to handle large files.
       * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html
       *
       * @params {string} content The string content
       * @params {string} buckey The s3 bucket
       * @params {string} key The s3 key (e.g. the path on S3)
       * @params {function} onDone Callback for when the file has been uploaded
       * @params {function} onProgress Callback called when there is a progress update
       */
      async uploadString(content, key, contentType) {

          if (!this.authenticated){
              throw new AuthError(`You need to be authenticated to call uploadString!`);
          }  
          
          if (!contentType){
              contentType = 'text/plain';
          }

          // Remove any slashes at the start or end of string
          key = key.replace(/^\/|\/$/g, '');

          //Logger.debug("Uploading " + fileName + " to S3: " + key);
          
          var options = {
              partSize: 10 * 1024 * 1024,
              queueSize: 1
          };

          const params = {
              ACL: this.opts.acl,
              Bucket: this.opts.bucket,
              Key: key,
              Body: content,
              ContentType: contentType
          };
              
              
          return new Promise((resolve, reject) => {    

              this.s3.upload(params, options)
                  //.on('httpUploadProgress', function(progress) {
                  //    Logger.debug("Progress:", progress);
                  //    if (onProgress){
                  //        onProgress(progress);
                  //    }
                  //})
                  .send(function(err, data) {
                      if (err){
                          return reject(err)
                      }
                      //Logger.debug("File uploaded:", data);
                      return resolve(key);
                  });
          })

      }

      // ///////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Delete a file on S3
       */
      async delete(key) {

          const params = {
              Bucket: this.opts.bucket,
              Key: key
          };

          return await this._write('deleteObject', params);

      }

      /**
       * Delete all items from s3
       * @param {object} items An object, with at minimum a Key field (i.e. the outout of a list)
       * @returns 
       */
      async deleteAll(items) {

          // Remove anything from the items list that isn't a Key or VersionId
          let cleaned = lodash.map(items, (item)=>{
              return {
                  Key: item.Key,
                  VersionId: item.VersionId
              }
          });

          const params = {
              Bucket: this.opts.bucket,
              Delete: {                    
                  Objects: cleaned
              }
          };

          return await this._write('deleteObjects', params);

      }    

  }

  class BaseS3Engine {
      
      constructor(){

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      _encode(str){
          if (typeof str != 'string'){
              Logger.error(`BaseS3Engine._encode() - ${str} is not a string, it is a ${typeof str}`);
              throw new Error(`${str} is not a string, it is a ${typeof str}`);
          }
          return base64url__default["default"](str);
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      _decode(hash){
          if (typeof hash != 'string'){
              Logger.error(`BaseS3Engine._decode() - ${hash} is not a string, it is a ${typeof hash}`);
              throw new Error(`${hash} is not a string, it is a ${typeof hash}`);
          }        
          return base64url__default["default"].decode(hash);
      }
         
  	// ///////////////////////////////////////////////////////////////////////////////////////

      __getPath(prefix, setName, val){        
          return this.__getKey(prefix, setName, val) + '/';  
      }

      __getKey(prefix, setName, val){        

          if (!setName){
              return `${this.rootPath}${prefix}`;
          }

          if (!val){
              return `${this.rootPath}${prefix}/${setName}`;
          }

          return `${this.rootPath}${prefix}/${setName}/${this._encode(val+'')}`;
      }

      __getKeyWithId(prefix, setName, val, id){        
          //const pad = "0000000";
          //const idStr = (pad+id).slice(-pad.length);    
          const idStr = id+'';        
          return `${this.rootPath}${prefix}/${setName}/${this._encode(val+'')}###${idStr}`;
      }

      __getKeyWithScore(prefix, setName, val, score){        
          //const pad = "0000000";
          //const scoreStr = (pad+score).slice(-pad.length);            
          const scoreStr = score+'';        
          return `${this.rootPath}${prefix}/${setName}/${scoreStr}###${this._encode(val+'')}`;    
      }

  }

  class AwsEngine extends BaseS3Engine {
      
      constructor(opts){
          super();      
          this.rootPath = (opts.prefix) ? opts.prefix : 's3orm/';
          this.aws = new S3Helper(opts);
          this.url = this.aws.rootUrl;        
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async getObjecTypes(){
          let res = await this.aws.list(this.__getKey('hash'));
          Logger.debug('Listing from ', this.__getKey('hash'));
          Logger.debug(res);
          return await Promise__default["default"].map(res, async (item)=>{
              return `${path}/${item.Key.split('/').pop()}`;
          });        
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async setObject(key, obj){
          let txt = JSON.stringify(obj);
          //let key = this.__getKey('sets', setName, val);
          await this.aws.uploadString(txt, this.__getKey('hash', key));
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async getObject(key){
          let res = await this.aws.get(this.__getKey('hash', key));
          return JSON.parse(res);
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async delObject(key){
           await this.aws.delete(this.__getKey('hash', key));
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async hasObject(key){
          return await this.aws.exists(this.__getKey('hash', key));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Return a list of objects at the given path. The return keys can be used directly 
       * with getObject.
       * @param {*} path 
       * @returns 
       */
      async listObjects(path){
          let key = this.__getPath('hash', path);
          let res = await this.aws.list(key);
          return await Promise__default["default"].map(res, async (item)=>{
              return `${path}/${item.Key.split('/').pop()}`;
              //return JSON.parse(await this.aws.get(item.Key));
          });
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async exists(key){
          return await this.aws.exists(this.__getKey('keyval', key));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async get(key){
          return await this.aws.get(this.__getKey('keyval', key));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async list(path, opts){
          let res = await this.aws.list(this.__getPath('keyval', path));
          return lodash.map(res, (item)=>{
              if (opts && opts.fullPath){
                  return item.Key;
              }
              return item.Key.split('/').pop();
          });        
      }        
      
      // ///////////////////////////////////////////////////////////////////////////////////////

      async set(key, val){
          try {
              await this.aws.uploadString(val, this.__getKey('keyval', key));
          }
          catch(err){
              Logger.error(`Tried to set ${val} to ${this.rootPath}${key} and get error ${err.toString()}`);
              process.exit(1);
          }
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async del(key){
          await this.aws.delete(this.__getKey('keyval', key));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async delBatch(keys){

          if (lodash.isEmpty(keys)){
              return null;
          }

          let list = lodash.map(keys, (key)=>{
              return {Key: this.__getKey('keyval', key)}
          });

          //Logger.debug('delBatch', list);
          
          await this.aws.deleteAll(list);
      }
      
      
  	// ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * If your bucket is not set for public read access, you can call this to set ready 
       * just on the folders used by this 
       */
      //async setupReadPermissions(){
      //    await this.aws.setFolderPublicRead('s3orm');
     // }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Add a value into a unordered set
       * @param {string} setName 
       * @param {string} val The value to add to the set
       * @param {string} meta We can also add some meta data associated with this member (S3 only)
       */
      async setAdd(setName, val, meta){   
          if (!meta){
              meta = '';
          }
          //let res = await this.aws.getObjectACL(`${this.rootPath}sets/${setName}`);
          //Logger.warn(res);
          //await this.aws.setObjectACL(`${this.rootPath}sets/${setName}`, 'public-read');    
          await this.aws.uploadString(meta, this.__getKey('sets', setName, val));
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Return any meta data associated with a set member
       * @param {string} setName 
       * @param {string} val 
       * @returns 
       */
      async setGetMeta(setName, val){
          return await this.aws.get(this.__getKey('sets', setName, val));
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async setRemove(setName, val){
          await this.aws.delete(this.__getKey('sets', setName, val));
      }

  	// ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Clear everything from a set
       * @param {string} setName The set name
       */
      async setClear(setName){
          let items = await this.aws.list(this.__getPath('sets', setName));
          if (items && items.length > 0){
              await this.aws.deleteAll(items);
          }
      }    

  	// ///////////////////////////////////////////////////////////////////////////////////////

      async setIsMember(setName, val){
          try {
              const key = this.__getKey('sets', setName, val);
              return await this.aws.exists(key);
          }
          catch(err){
              return false;
          }
      }
      
  	// ///////////////////////////////////////////////////////////////////////////////////////

      async setMembers(setName){        
          let res = await this.aws.list(this.__getPath('sets', setName));
          let list = lodash.map(res, (item)=>{
              return this._decode(item.Key.split('/').pop());
          });
          return list;
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Get the intersection of a number of sets
       * @param {array} keys An array of strings, with each string being the key of the set
       */
       async setIntersection(keys){
          let items = await Promise__default["default"].map(keys, async (setName) => {            
              return this.setMembers(setName);
          });        

          return lodash.intersection(...items);
      }
      
  	// ///////////////////////////////////////////////////////////////////////////////////////

      // zrevrangebyscore, zrangebyscore, zrem

      // ///////////////////////////////////////////////////////////////////////////////////////
          
      /**
       * zadd
       * @param {string} setName 
       * @param {int} score 
       * @param {string} val 
       */
      async zSetAdd(setName, score, val, meta){
          //Logger.debug(`zSetAdd(setName = ${setName}, score = ${score}, val = ${val}, meta = ${meta})`)
          if (meta === false){
              meta = 'false';
          }    
          else if (!meta && meta != 0){
              meta = '';
          }
          let key = this.__getKeyWithScore('zsets', setName, val, score);
          await this.aws.uploadString(meta, key);

      }
      
      // ///////////////////////////////////////////////////////////////////////////////////////

      async zSetRemove(setName, score, val){
          let key = this.__getKeyWithScore('zsets', setName, val, score);
          await this.aws.delete(key);
      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * Get tge last item (the max) from the zset as quickly as possible
       * @param {*} setName 
       * @param {*} scores 
       * @returns 
       */
      async zGetMax(setName, scores){

          let key = this.__getKey('zsets', setName)+'/';
          let res = await this.aws.list(key);
          
          let item = res.pop();

          key = item.Key.split('/').pop();
          let parts = key.split('###');
          parts[1] = this._decode(parts[1]);

          if (scores){
              return {
                  score: parseInt(parts[0]),
                  val: parts[1]
              }    
          }

          return parts[1];

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      async zSetMembers(setName, scores){
          
          let key = this.__getPath('zsets', setName);
          //let key = `${this.rootPath}zsets/${setName}/`;
          let res = await this.aws.list(key);

          let list = lodash.map(res, (item)=>{

              key = item.Key.split('/').pop();
              let parts = key.split('###');
              parts[1] = this._decode(parts[1]);

              if (scores){
                  return {
                      score: parseFloat(parts[0]),
                      val: parts[1]
                  }    
              }

              return parts[1];
              
          });

          return list;
      }
      
      // ///////////////////////////////////////////////////////////////////////////////////////

      async zSetClear(setName){

          let items = await this.aws.list(this.__getPath('zsets', setName));
          if (items && items.length > 0){
              await this.aws.deleteAll(items);
          }

          items = await this.aws.list(`${this.__getKey('zsets', setName)}/expires/`);        
          if (items && items.length > 0){
              await this.aws.deleteAll(items);
          }

      }

      // ///////////////////////////////////////////////////////////////////////////////////////

      /**
       * 
       * @param {*} setName 
       * @param {*} opts gt, gte, lt, lte, limit, order (ASC or DESC), scores
       * @returns 
       */
      async zRange(setName, opts){

          //Logger.debug(`Entering zRange, setName = ${setName}`, opts);

          let res = await this.zSetMembers(setName, true);
      
          if (!opts.$lt && !opts.$lte && !opts.$gt && !opts.$gte){
              throw new Error(`You need to set at least one range specifier ($lt, $lte, $gt, $gte)!`);
          }

          let items = [];

          function isNull(val){
              if (val === 0){
                  return false;
              }
              return isNull(val) || lodash.isUndefined(val);
          }

          for (let i=0; i<res.length; i+=1){

              let item = res[i];
              let lowerFlag = false;
              let upperFlag = false;

              if (isNull(opts.$lt) && isNull(opts.$lte)){
                  lowerFlag = true;
              }
              if (isNull(opts.$gt) && isNull(opts.$gte)){
                  upperFlag = true;
              }

              if (!isNull(opts.$gt) && item.score > opts.$gt){
                  upperFlag = true;
              }
              else if (!isNull(opts.$gte) && item.score >= opts.$gte){
                  upperFlag = true;
              }

              if (!isNull(opts.$lt) && item.score < opts.$lt){
                  lowerFlag = true;
              }
              else if (!isNull(opts.$lte) && item.score <= opts.$lte){
                  lowerFlag = true;
              }

              /*
              Logger.debug(`zRange() 
                  score = ${item.score}, 
                  lowerFlag = ${lowerFlag}, 
                  upperFlag = ${upperFlag},                
                  $lt = ${(isNull(opts.$lt)) ? 'null' : opts.$lt},
                  $lte = ${(isNull(opts.$lte)) ? 'null' : opts.$lte},
                  $gt = ${(isNull(opts.$gt)) ? 'null' : opts.$gt},
                  $gte = ${(isNull(opts.$gte)) ? 'null' : opts.$gte},
                  `);
                  */

                

              if (lowerFlag && upperFlag){
                  if (opts.score){
                      items.push(item);
                  }
                  else {
                      items.push(item.val);
                  }
              }
          }
          
          if (opts.order && opts.order == 'DESC'){
              items = lodash.reverse(items);
          }
          
          if (opts.limit){
              items = lodash.slice(items, 0, opts.limit);
          }

          return items;
      }


  }

  class Storm {

      constructor(opts){
          this.meta = {};
          this.s3 = new AwsEngine(opts);
      }

      async listModels(){
          return await this.s3.setMembers('meta');
      }

      /**
       * Load all model schemas
       * @returns 
       */
      async getSchemas(){

          let list = await this.listModels();
          this.meta = {};
  		
          for (let i = 0; i < list.length; i += 1) {
  			let name = list[i];
              let meta = await this.s3.setGetMeta('meta', name);
  			this.meta[name] = JSON.parse(meta);
              Logger.debug(this.meta[name]);
         	}

          return this.meta;

      }    

      /**
       * Factory method to create a new instance of a S3 ORM (aka Storm) Model
       * 
       * The model schema should look like;
       *
       *  [
       *      id: {type: DataTypes.Number, index:true},
       *      noUsersInGame: {type: DataTypes.Number, defaultValue:0},
       *      noUsers: {type: DataTypes.Number, defaultValue:0},
       *      isStarted: {type: DataTypes.Number, defaultValue: 0},clear
       *      startTime: {type: 'date', defaultValue: ()=>{return Date.now()}}
       *      currentQuestionId: {type: DataTypes.Number, defaultValue: 0},
       *      questionIds: {type:'array', default: []}
       *  ]
       *
       * @param {string} name The model name
       * @param {object} schema The model schema
       */
      define(name, schema, options){

          var extendedSchema = {};
          
          if (this.s3.authenticated && this.s3.setAdd){
              // Add table name and schema to meta info, but we don't need to wait
              this.s3.setAdd('meta', name, JSON.stringify(schema));
          }

          this.meta[name] = schema;

          // Support for field meta data being passed as a simple type, i.e.
          // 
          // fullName: DataTypes.String,
          // vs
          // level: { type: DataTypes.String }
          //        
          for (let key in schema){
              if (!lodash.isObject(schema[key])){
                  extendedSchema[key] = {type: schema[key]};
              }
              else {
                  extendedSchema[key] = schema[key];
              }
          }

          // Enforce a type for the id
          extendedSchema.id = {
              type: DataTypes$1.Id,
              index: true
          };  

          if (!extendedSchema['created']){
              extendedSchema.created = {
                  type: DataTypes$1.Date,
                  index: true,
                  defaultValue: function () {
                      return new Date();
                  },
              };    
          }

          if (!extendedSchema['modified']){
              extendedSchema.modified = {
                  type: DataTypes$1.Date,
                  onUpdateOverride: function () {
                      return new Date();
                  },
              };    
          }

          class Model extends BaseModel {

              constructor(data) {
                  super(data);
              }
          
              static _opts(){
                  return (options) ? options : {}
              }

              static _name(){
                  return name
              }

              static _model(){
                  return extendedSchema
              }

              static _schema(){
                  return extendedSchema
              }            

          }

          Model.s3 = this.s3;

          return Model;
      }

  }

  //import ClientEngine from "./engines/ClientEngine";

  const DataTypes = {
      Id: IdType$1,
      Uuid: UuidType$1,
      Json: JsonType$1,
      Float: FloatType$1,
      Number: IntegerType$1,
      Integer: IntegerType$1,
      String: StringType$1,
      Boolean: BooleanType$1,
      Array: ArrayType$1,
      Date: DateType$1
  };

  exports.DataTypes = DataTypes;
  exports.Engine = AwsEngine;
  exports.Model = BaseModel;
  exports.Storm = Storm;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=s3orm.js.map
