import "reflect-metadata";
import { ModelMetaStore } from "./ModelMetaStore";
import { type EntityParams } from "../types";
import Logger from "../utils/Logger";
import {cyan, blue} from "colorette";

export function Entity(params?: EntityParams): ClassDecorator {
    return function <T extends Function>(target: T): T {
        const className = target.name;
        const modelOptions = params || {};
        ModelMetaStore.addColumnMeta(className, modelOptions);
        return target;
    };
}
