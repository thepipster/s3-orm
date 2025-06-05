export default class Logger {
    private static _logger;
    static showStackTrace: boolean;
    static stackDepth: number;
    static init(): void;
    private static __getStackTrace;
    private static __serialize;
    static setLevel(lvl: string): void;
    static log(...args: any[]): void;
    static debug(...args: any): void;
    static info(...args: any[]): void;
    static warn(...args: any[]): void;
    static error(...args: any[]): void;
    static fatal(...args: any[]): void;
}
//# sourceMappingURL=Logger.d.ts.map