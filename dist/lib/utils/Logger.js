"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const callsite_1 = __importDefault(require("callsite"));
const colorts_1 = __importDefault(require("colorts")); // https://shaselle.github.io/colors.ts/
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const winston = __importStar(require("winston"));
const format = winston.format;
class Logger {
    static init() {
        const myFormat = format.printf((info) => {
            return `${info.level} ${info.message}`;
        });
        const transports = [
            new winston.transports.Console({
                level: "debug",
                // See https://github.com/winstonjs/logform
                format: format.combine(format.timestamp({
                    //format: 'ddd MMM DD h:mm:ss YYYY'
                    format: "ddd MMM DD h:mm:ss",
                }), format.label({
                    label: "[LOGGER]",
                }), format.colorize(), myFormat),
            }),
        ];
        Logger._logger = winston.createLogger({
            transports: transports,
        });
    }
    static __getStackTrace(stackObj) {
        let trace_str = "";
        let depth = 1;
        let startDepth = 2;
        const maxDepth = startDepth + Logger.stackDepth - 1;
        if (stackObj) {
            stackObj.forEach(function (site) {
                if (site) {
                    const no = site.getLineNumber();
                    let fname = site.getFileName();
                    fname = fname ? path.basename(fname) : fname;
                    if (fname == "Logger.js") {
                        startDepth = depth + 1;
                    }
                    if (depth == startDepth) {
                        trace_str += `{from ${(0, colorts_1.default)(fname).bold}:${no}`;
                    }
                    else if (no && depth > startDepth && depth <= startDepth + maxDepth) {
                        trace_str += `, ${fname}:${no}`;
                    }
                }
                depth += 1;
            });
            if (trace_str) {
                trace_str += "}";
            }
        }
        return (0, colorts_1.default)(trace_str).gray;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static __serialize(...args) {
        let msg = "";
        for (let i = 0; i < args.length; i++) {
            if (args[i] && typeof args[i] == "object") {
                // Add support for calling the dataValues method of the redis ORM
                if (typeof args[i].dataValues == "function") {
                    msg +=
                        util.inspect(args[i].dataValues(), {
                            colors: true,
                            compact: true,
                            breakLength: 60,
                            depth: 4,
                        });
                }
                // If this is a sequelize object, use it's dataValues instead
                else if (typeof args[i].dataValues != "undefined") {
                    msg +=
                        util.inspect(args[i].dataValues, {
                            colors: true,
                            compact: true,
                            breakLength: 60,
                            depth: 4,
                        });
                }
                else {
                    msg +=
                        util.inspect(args[i], {
                            colors: true,
                            compact: true,
                            breakLength: 60,
                            depth: 4,
                        });
                }
            }
            else {
                msg += args[i];
            }
            msg += " ";
        }
        return msg;
    }
    static setLevel(lvl) {
        Logger._logger.level = lvl;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static log(...args) {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace((0, callsite_1.default)());
        }
        Logger._logger.log.apply(Logger._logger, ["log", str]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static debug(...args) {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace((0, callsite_1.default)());
        }
        Logger._logger.log.apply(Logger._logger, ["debug", str]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static info(...args) {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace((0, callsite_1.default)());
        }
        Logger._logger.log.apply(Logger._logger, ["info", str]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static warn(...args) {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace((0, callsite_1.default)());
        }
        Logger._logger.log.apply(Logger._logger, ["warn", str]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static error(...args) {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace((0, callsite_1.default)());
        }
        Logger._logger.log.apply(Logger._logger, ["error", str]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fatal(...args) {
        // fatals always include a stack trace
        const str = Logger.__serialize(args) + Logger.__getStackTrace((0, callsite_1.default)());
        Logger._logger.log.apply(Logger._logger, ["error", str]);
    }
}
Logger.showStackTrace = true;
Logger.stackDepth = 2;
exports.default = Logger;
;
Logger.init();
Logger.setLevel("debug");
//# sourceMappingURL=Logger.js.map