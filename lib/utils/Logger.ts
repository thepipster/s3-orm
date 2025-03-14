//import callsites from 'callsites';
//const { default: callsites } = await import('callsites');
import {callsites} from "./callsites";
import {cyan, blue, green, gray, bold} from "colorette";
import * as path from "path";
import * as util from "util";
import * as winston from "winston";
const format = winston.format;

// https://github.com/winstonjs/winston#readme

const Logger = {

    _logger: null,

    showStackTrace: true,

    stackDepth: 2,

    init() {
        const myFormat = format.printf((info) => {
            return `${info.level} ${info.message}`;
        });

        const transports = [
            new winston.transports.Console({
                level: "debug",
                // See https://github.com/winstonjs/logform
                format: format.combine(
                    format.timestamp({
                        //format: 'ddd MMM DD h:mm:ss YYYY'
                        format: "ddd MMM DD h:mm:ss",
                    }),
                    format.label({
                        label: "[LOGGER]",
                    }),
                    format.colorize(),
                    myFormat
                ),
            }),
        ];

        Logger._logger = winston.createLogger({
            transports: transports,
        });
    },

    
    __getStackTrace(stackObj) {

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

                    if (fname == "Logger.js" || fname == "Logger.ts") {
                        startDepth = depth + 1;
                    }

                    if (depth == startDepth) {
                        trace_str += `{from ${bold(fname)}:${no}`;
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

        return gray(trace_str);
    },
    

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __serialize(...args: any[]): string {

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
                } else {
                    msg +=
                        util.inspect(args[i], {
                            colors: true,
                            compact: true,
                            breakLength: 60,
                            depth: 4,
                        });
                }
            } else {
                msg += args[i];
            }

            msg += " ";
        }

        return msg;
    },

    setLevel(lvl: string) {
        Logger._logger.level = lvl;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (this.showStackTrace) {
            str += Logger.__getStackTrace(callsites());
        }
        Logger._logger.log.apply(Logger._logger, ["log", str]);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug(...args: any): void {
        let str = Logger.__serialize(...args);
        if (this.showStackTrace) {
            str += Logger.__getStackTrace(callsites());
        }
        Logger._logger.log.apply(Logger._logger, ["debug", str]);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (this.showStackTrace) {
            str += Logger.__getStackTrace(callsites());
        }
        Logger._logger.log.apply(Logger._logger, ["info", str]);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (this.showStackTrace) {
            str += Logger.__getStackTrace(callsites());
        }
        Logger._logger.log.apply(Logger._logger, ["warn", str]);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (this.showStackTrace) {
            str += Logger.__getStackTrace(callsites());
        }
        Logger._logger.log.apply(Logger._logger, ["error", str]);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fatal(...args: any[]): void {
        // fatals always include a stack trace
        const str = Logger.__serialize(args); // + Logger.__getStackTrace(callsites());
        Logger._logger.log.apply(Logger._logger, ["error", str]);
    },
};

Logger.init();
Logger.setLevel("debug");

export default Logger;