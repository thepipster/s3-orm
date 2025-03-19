import Logger from "./Logger";


type ProfilerData = {
    label: string;
    count: number; // number of times this label was called 
    total: number; // total time spent in this label
    time: number[]; // prev time this label was called
}   

export class Profiler {

    static data: Map<string, ProfilerData> = new Map();

    /**
    * Start a timer, with a given label
    */
    static start(label: string){
        this.data.set(label, {
            label: label,
            count: 0,
            total: 0,
            time: process.hrtime()
        });
    };

    /**
    * Stop a timer, with a given label
    */
    static stop(label: string){
        try {
            
            let prev: ProfilerData = this.data.get(label);

            if (!prev){
                return
            }

            let elapsed = Profiler.__getElapsedTime(prev.time);
            //let delta = parseFloat(elapsed.milliseconds + elapsed.seconds*1000)
            prev.time = process.hrtime();
            prev.count += 1;
            prev.total += elapsed;

            this.data.set(label, prev);
            
            return elapsed;
        }
        catch(err){
            Logger.error(err, label, this.data)
        }
    };

    /**
    * Show results for all timers
    */
    static showResults(){

        let msg = '';

        this.data.forEach((meta: ProfilerData, label: string) => {

            if (meta.count > 1){
                let average = (meta.total / meta.count).toLocaleString('en', {maximumFractionDigits : 2})
                msg = `[Profiler] ${label} took an average of ${average} ms (${meta.count} calls, total of ${meta.total.toLocaleString('en', {maximumFractionDigits : 2})} ms)`
            }
            else {
                msg = `[Profiler] ${label} took ${meta.total} ms`
            }

        });

        Logger.info(msg);
        
    };

    /**
     * Get the current unix epoch time stamp, in high precision milliseconds
     * @returns 
     */
    private static __getTimestamp(): number {        
        const start = process.hrtime();
        const end = process.hrtime(start);        
        const seconds: number = end[0];
        const nanoseconds : number = end[1];
        const milliseconds : number = (seconds * 1000) + (nanoseconds / 1000000);
        return milliseconds;
    }

    private static __getElapsedTime(startTimestamp): number {
        const end = process.hrtime(startTimestamp);
        const seconds: number = end[0];
        const nanoseconds : number = end[1];
        const milliseconds : number = (seconds * 1000) + (nanoseconds / 1000000);
        return milliseconds;

    }
        



}

