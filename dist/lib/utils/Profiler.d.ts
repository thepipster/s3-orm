type ProfilerData = {
    label: string;
    count: number;
    total: number;
    time: number;
};
export declare class Profiler {
    static data: Map<string, ProfilerData>;
    /**
    * Start a timer, with a given label
    */
    static start(label: string): void;
    /**
    * Stop a timer, with a given label
    */
    static stop(label: string): number;
    /**
    * Show results for all timers
    */
    static showResults(): void;
}
export {};
//# sourceMappingURL=Profiler.d.ts.map