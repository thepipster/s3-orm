"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelMetaStore = void 0;
const Stash_1 = require("../core/Stash");
const IdType_1 = require("../columns/IdType");
class ModelMetaStore {
    static addColumnMeta(modelName, meta) {
        this.entityMetas.set(modelName, meta);
    }
    /**
     * Get the schema (meta data) for the given column and model
     * @param modelName
     * @param columnName
     * @returns
     */
    static getColumn(modelName, columnName) {
        //Logger.debug(this.store);
        if (!this.store.has(modelName)) {
            throw new Error(`Model ${modelName} not found!`);
        }
        const col = this.store.get(modelName);
        if (!col[columnName]) {
            throw new Error(`Model ${modelName} not no column called ${columnName}!`);
        }
        return col[columnName];
    }
    static hasColumn(modelName, columnName) {
        if (!this.store.has(modelName)) {
            throw new Error(`Model ${modelName} not found!`);
        }
        const col = this.store.get(modelName);
        if (!col[columnName]) {
            return false;
        }
        return true;
    }
    static get(modelName) {
        if (!this.store.has(modelName)) {
            throw new Error(`Model ${modelName} not found!`);
        }
        return this.store.get(modelName);
    }
    static addColumn(modelName, meta) {
        // This is the first time we are adding a column to this model
        if (!this.store.has(modelName)) {
            // By default, we add the id column
            const idCol = {
                name: 'id',
                type: 'integer',
                isNumeric: true,
                index: true,
                unique: true,
                encode: IdType_1.IdType.encode,
                decode: IdType_1.IdType.decode
            };
            this.store.set(modelName, { id: idCol });
        }
        const col = this.store.get(modelName);
        col[meta.name] = meta;
        if (Stash_1.Stash.debug) {
            //col.forEach(function(fieldInfo: ColumnSchema, name: string){
            //    Logger.debug(`[${cyan(modelName)}] ${blue(name)}`, fieldInfo);        
            //});    
        }
    }
}
exports.ModelMetaStore = ModelMetaStore;
ModelMetaStore.store = new Map();
ModelMetaStore.entityMetas = new Map();
//# sourceMappingURL=ModelMetaStore.js.map