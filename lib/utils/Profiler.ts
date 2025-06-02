import Logger from "./Logger";
 const { performance } = require('perf_hooks');

type ProfilerData = {
    label: string;
    count: number; // number of times this label was called 
    total: number; // total time spent in this label
    time: number; // prev time this label was called
}   

export class Profiler {

    static data: Map<string, ProfilerData> = new Map();

    /**
    * Start a timer, with a given label
    */
    static start(label: string){

        const startTime = performance.now();

        if (!this.data.has(label)){
            this.data.set(label, {
                label: label,
                count: 0,
                total: 0,
                time: startTime
            });  
        }
        else {
            let prev: ProfilerData = this.data.get(label);
            prev.time = startTime;  
            this.data.set(label, prev);
        }


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

            let elapsed = performance.now() - prev.time;
            prev.time = performance.now();
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


}

