import Logger from "./Logger";

/**
* Profiler
*/
Profiler = (function(){

    function cls()
    {
        // private instance field
        var times = {};
        var count = {};
        var total = {};

        /**
        * Start a timer, with a given label
        */
        this.start = function(label){
            if (!count[label]){
                count[label] = 0
                total[label] = 0
            }
            times[label] = Date.now() //process.hrtime();
        };

        /**
        * Stop a timer, with a given label
        */
        this.stop = function(label){
            try {
                
                if (!(label in times)) {
                    return
                }

                //let elapsed = __getElapsedTime(times[label]);
                //let delta = parseFloat(elapsed.milliseconds + elapsed.seconds*1000)
                let delta = Date.now() - times[label]

                count[label] += 1
                total[label] += delta
                
                return delta
            }
            catch(err){
                Logger.error(err, label, times)
            }
        };

        /**
        * Show results for all timers
        */
        this.showResults = function(){
            for (label in times){

                let msg = ''
                if (count[label] > 1){
                    let average = (total[label] / count[label]).toLocaleString('en', {maximumFractionDigits : 2})
                    msg = `[Profiler] ${label} took an average of ${average} ms (${count[label]} calls, total of ${total[label].toLocaleString('en', {maximumFractionDigits : 2})} ms)`
                }
                else {
                    msg = `[Profiler] ${label} took ${total[label]} ms`
                }

                Logger.info(msg);
            }
        };

        function __getElapsedTime(startTimestamp){
            var precision = 3; // 3 decimal places
            var elapsed = process.hrtime(startTimestamp)[1] / 1000000; // divide by a million to get nano to milli
            var s = process.hrtime(startTimestamp)[0]
            var ms = elapsed.toFixed(precision)
            startTimestamp = process.hrtime(); 
            return {seconds: parseInt(s), milliseconds: ms};
        }

    }

    return cls;
})();


export default  Profiler;