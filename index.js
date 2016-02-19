/**
 * index.js
 *
 * AWS Lambda function Uploader.
 *
 * Created by kylewbanks on 15-02-28.
 */
'use strict';

/**
 * @imports
 */
var AWS = require('aws-sdk'),
    async = require('async'),
    fs = require('fs'),
    archiver = require('archiver'),
    util = require('util');

/**
 * @private
 */
var _testMode = process.env.LAMBDA_UPLOADER_TEST;

/**
 * Internal helper method for debug logging in test mode.
 */
function _log() {
    if (_testMode) {
        console.log.apply(console, arguments);
    }
}

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

        // Make sure the lambda instance is instantiated after the AWS.config.update
        var lambda = new AWS.Lambda(
            {
                apiVersion: '2014-11-11'
            }
        );

        async.waterfall([

            /**
             * Compress the source directory into a ZIP file.
             *
             * @param next {function(Error, String)}
             */
            function(next) {
                var zipFilePath = util.format('%s.lambda.tmp.zip', new Date().getTime());
                _log("Generating zip file: %s", zipFilePath);

                var zipStream = fs.createWriteStream(zipFilePath);
                var archive = archiver('zip');

                zipStream.on('close', function() {
                    _log("Zip stream closed");
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
                _log("Uploading function...");
                lambda.uploadFunction({
                    FunctionName: name,
                    FunctionZip: fs.readFileSync(zipFilePath),
                    Handler: handler,
                    Mode: 'event',
                    Role: role,
                    Runtime: 'nodejs',
                    MemorySize: memory,
                    Timeout: timeout
                }, function(err) {
                    _log("Upload complete");
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
                _log("Deleting zipped lambda function");
                fs.unlink(zipFilePath, next);
            }

        ], function(err) {
            if (err) {
                _log(err);
            }

            if (cb && typeof cb === 'function') {
                cb(err);
            }
        });
    }

};

if (_testMode) {
    module.exports.AWS = AWS;
    module.exports.lambda = new AWS.Lambda(
        {
            apiVersion: '2014-11-11'
        }
    );
    module.exports.fs = fs;
}
