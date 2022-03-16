import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import babel from "@rollup/plugin-babel";
import pkg from "./package.json";
import json from '@rollup/plugin-json';
import sourcemaps from 'rollup-plugin-sourcemaps';
import autoNamedExports from 'rollup-plugin-auto-named-exports';
import builtins from 'rollup-plugin-node-builtins';
// rollup-plugin-node-polyfills

// List of plugins here; https://github.com/rollup/plugins

// Add here external dependencies that actually you use.
const globals = {
	'lodash': 'lodash',
	'bluebird': 'Promise'
};

export default [
	{
		input: "index.js",
		output: [
			{
				name: "s3orm",
				file: pkg.browser,
				format: "umd",
				globals: globals,
				sourcemap: true
			},
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
		],
		plugins: [
			resolve(),
			commonjs(),
			autoNamedExports(),
			babel({
				//exclude: ["node_modules/**"],
			}),
			json(),
			sourcemaps(),
			builtins()
		],
	}
];