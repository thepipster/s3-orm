"use strict";

export default Logger = {

    levels: {
        'debug': 1,
        'info': 2,
        'warn': 3,
        'warning': 3,
        'error': 4,
        'fatal': 5
    },

    level: 1,

	setLevel(lvl) {
		Logger.level = Logger.levels[lvl];
	},

	log() {    
        if (Logger.level >= Logger.levels['debug']){
            console.log(arguments);    
        }
	},

	debug() {                
        if (Logger.level >= Logger.levels['debug']){
            console.log(arguments);    
        }
	},

	info() {          
        if (Logger.level >= Logger.levels['info']){
            console.info(arguments);    
        }
  	},

	warn() {
        if (Logger.level >= Logger.levels['warn']){
            console.warn(arguments);    
        }
	},

	error() {
        if (Logger.level >= Logger.levels['error']){
            console.error(arguments);    
        }
	},

	fatal() {
        if (Logger.level >= Logger.levels['fatal']){
            console.error(arguments);    
        }
	}     
};