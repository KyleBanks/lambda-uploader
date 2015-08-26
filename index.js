/**
 * index.js
 *
 * AWS Lambda function Uploader.
 *
 * Created by kylewbanks on 15-02-28.
 */

/**
 * @imports
 */
var AWS = require('aws-sdk');
var async = require('async');
var fs = require('fs');
var archiver = require('archiver');

/**
 * @private
 */
var _lambda = new AWS.Lambda(
    {
        apiVersion: '2014-11-11'
    }
);

/**
 * @public
 */
module.exports = {

    /**
     * Uploads a source directory to AWS Lambda, either creating a new function or overwriting
     * the function with the specified name if it already exists.
     *
     * @param region {String}
     * @param name {String}
     * @param directoryPath {String}
     * @param handler {String} The name of the function handler in the format of "<filename>.<exported-function-name>"
     *  ex: index.handler
     * @param role {String} The ARN of the Lambda Execution Role
     * @param memory {Number} The amount of memory, in MB, your Lambda function is given.
     * @param timeout {Number} The function execution time at which Lambda should terminate the function, in seconds.
     * @param cb {function(Error)}
     */
    uploadFunction: function(region, name, directoryPath, handler, role, memory, timeout, cb) {
        AWS.config.update({
            region: region
        });

        async.waterfall([

            /**
             * Compress the source directory into a ZIP file.
             *
             * @param next {function(Error, String)}
             */
            function(next) {
                var zipFilePath = 'tmp-lambda-func.zip';
                var zipStream = fs.createWriteStream(zipFilePath);
                var archive = archiver('zip');

                zipStream.on('close', function() {
                    next(null, zipFilePath);
                });

                archive.on('error', next);

                archive.pipe(zipStream);
                archive.directory(directoryPath, false);
                archive.finalize();
            },

            /**
             * Upload the zip and create the lambda function.
             *
             * @param zipFilePath {String}
             * @param next {function(Error, String)}
             */
            function(zipFilePath, next) {
                _lambda.uploadFunction({
                    FunctionName: name,
                    FunctionZip: fs.readFileSync(zipFilePath),
                    Handler: handler,
                    Mode: 'event',
                    Role: role,
                    Runtime: 'nodejs',
                    MemorySize: memory,
                    Timeout: timeout
                }, function(err) {
                    next(err, zipFilePath);
                });
            },

            /**
             * Delete the Zipped Lambda function.
             *
             * @param zipFilePath {String}
             * @param next {function(Error)}
             */
            function(zipFilePath, next) {
                fs.unlink(zipFilePath, next);
            }

        ], cb);
    }

};
