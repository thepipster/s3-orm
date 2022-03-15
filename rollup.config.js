export default {
    input: "index.js",
    output: [
        {
            file: "dist/s3orm.common.js",
            format: "cjs",
        },
        {
            file: "dist/s3orm.es6.js",
            format: "es",
        }
    ]
        
};
