"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profiler = void 0;
const Logger_1 = __importDefault(require("./Logger"));
const { performance } = require('perf_hooks');
class Profiler {
    /**
    * Start a timer, with a given label
    */
    static start(label) {
        const startTime = performance.now();
        if (!this.data.has(label)) {
            this.data.set(label, {
                label: label,
                count: 0,
                total: 0,
                time: startTime
            });
        }
        else {
            let prev = this.data.get(label);
            prev.time = startTime;
            this.data.set(label, prev);
        }
    }
    ;
    /**
    * Stop a timer, with a given label
    */
    static stop(label) {
        try {
            let prev = this.data.get(label);
            if (!prev) {
                return;
            }
            let elapsed = performance.now() - prev.time;
            prev.time = performance.now();
            prev.count += 1;
            prev.total += elapsed;
            this.data.set(label, prev);
            return elapsed;
        }
        catch (err) {
            Logger_1.default.error(err, label, this.data);
        }
    }
    ;
    /**
    * Show results for all timers
    */
    static showResults() {
        let msg = '';
        this.data.forEach((meta, label) => {
            if (meta.count > 1) {
                let average = (meta.total / meta.count).toLocaleString('en', { maximumFractionDigits: 2 });
                msg = `[Profiler] ${label} took an average of ${average} ms (${meta.count} calls, total of ${meta.total.toLocaleString('en', { maximumFractionDigits: 2 })} ms)`;
            }
            else {
                msg = `[Profiler] ${label} took ${meta.total} ms`;
            }
        });
        Logger_1.default.info(msg);
    }
    ;
}
exports.Profiler = Profiler;
Profiler.data = new Map();
//# sourceMappingURL=Profiler.js.map