//import resolve from "@rollup/plugin-node-resolve";
//import commonjs from '@rollup/plugin-commonjs';
//import babel from "@rollup/plugin-babel";
import pkg from "./package.json";
//import json from '@rollup/plugin-json';
//import sourcemaps from 'rollup-plugin-sourcemaps';
//import builtins from 'rollup-plugin-node-builtins';
// rollup-plugin-node-polyfills

// List of plugins here; https://github.com/rollup/plugins

// Add here external dependencies that actually you use.
const globals = {
	'lodash': 'lodash',
	'bluebird': 'Promise'
};

// rollup main.js --file bundle.js --format umd --name "myBundle"


export default [
	{
		input: "index.js",
		output: [
			{
				name: "s3orm",
				file: pkg.main,
				format: "umd",
				globals: globals,
				sourcemap: true
			},
			/*
			{
				name: "s3orm",
				file: pkg.module,
				format: "es",
				globals: globals,
				sourcemap: true
			},	
			{
				name: "s3orm",
				file: pkg.main,
				format: "cjs",
				globals: globals,
				sourcemap: true
			}		
			*/			
		],
		plugins: [
			//resolve(),
			//commonjs(),
			//babel({
				//exclude: ["node_modules/**"],
			//}),
			//json(),
			//sourcemaps(),
			//builtins()
		],
	}
];