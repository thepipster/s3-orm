import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default [
    {
        input: 'main-client.js',
        output: {
            file: 'dist/s3orm.js',
            format: 'iife',
            name: 's3orm'
        },
        plugins: [commonjs(), resolve(), json()]
    },
    {
        input: 'main-client.js',
        output: {
            file: 'dist/s3orm.es6.js',
            format: 'es',
            name: 's3orm'
        },
        plugins: [commonjs(), resolve(), json()]
    },    
    {
        input: 'main-client.js',
        output: {
            file: 'dist/s3orm.umd.js',
            format: 'umd',
            name: 's3orm'
        },
        plugins: [commonjs(), resolve(), json()]
    },      
];
