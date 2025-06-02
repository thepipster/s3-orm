"use strict";

import callsite, {CallSite } from "callsite";
import color from "colorts"; // https://shaselle.github.io/colors.ts/
import * as path from "path";
import * as util from "util";
import * as winston from "winston";
const format = winston.format;


export default class Logger {

    private static _logger: winston.Logger;

    static showStackTrace: boolean = true;

    static stackDepth: number = 2

    static init() {
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
    }

    private static __getStackTrace(stackObj: CallSite[]) {

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
                        trace_str += `{from ${color(fname).bold}:${no}`;
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

        return color(trace_str).gray;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static __serialize(...args: any[]): string {

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
    }

    static setLevel(lvl: string) {
        Logger._logger.level = lvl;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static log(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace(callsite());
        }
        Logger._logger.log.apply(Logger._logger, ["log", str]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static debug(...args: any): void {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace(callsite());
        }
        Logger._logger.log.apply(Logger._logger, ["debug", str]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static info(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace(callsite());
        }
        Logger._logger.log.apply(Logger._logger, ["info", str]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static warn(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace(callsite());
        }
        Logger._logger.log.apply(Logger._logger, ["warn", str]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static error(...args: any[]): void {
        let str = Logger.__serialize(...args);
        if (Logger.showStackTrace) {
            str += Logger.__getStackTrace(callsite());
        }
        Logger._logger.log.apply(Logger._logger, ["error", str]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fatal(...args: any[]): void {
        // fatals always include a stack trace
        const str = Logger.__serialize(args) + Logger.__getStackTrace(callsite());
        Logger._logger.log.apply(Logger._logger, ["error", str]);
    }
};

Logger.init();
Logger.setLevel("debug");

//module.exports = Logger
