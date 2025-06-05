"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Person = void 0;
const index_1 = require("../index");
let Person = class Person extends index_1.Model {
};
exports.Person = Person;
__decorate([
    (0, index_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Person.prototype, "email", void 0);
__decorate([
    (0, index_1.Column)({ type: 'integer', index: true }),
    __metadata("design:type", Number)
], Person.prototype, "age", void 0);
__decorate([
    (0, index_1.Column)({ type: 'float', index: true }),
    __metadata("design:type", Number)
], Person.prototype, "score", void 0);
__decorate([
    (0, index_1.Column)({ index: true }),
    __metadata("design:type", String)
], Person.prototype, "fullName", void 0);
__decorate([
    (0, index_1.Column)({ index: true }),
    __metadata("design:type", String)
], Person.prototype, "lastIp", void 0);
__decorate([
    (0, index_1.Column)({ index: true }),
    __metadata("design:type", Date)
], Person.prototype, "lastLogin", void 0);
__decorate([
    (0, index_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], Person.prototype, "preferences", void 0);
__decorate([
    (0, index_1.Column)({ type: 'array' }),
    __metadata("design:type", Array)
], Person.prototype, "tags", void 0);
__decorate([
    (0, index_1.Column)({ default: 'user', index: true }),
    __metadata("design:type", String)
], Person.prototype, "level", void 0);
__decorate([
    (0, index_1.Column)({ default: 'active', index: true }),
    __metadata("design:type", String)
], Person.prototype, "status", void 0);
exports.Person = Person = __decorate([
    (0, index_1.Entity)({ expires: 100 })
], Person);
//# sourceMappingURL=Person.js.map