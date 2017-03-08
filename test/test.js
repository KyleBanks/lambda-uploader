/**
 * test.js
 *
 * Created by kylewbanks on 16-01-24.
 */
'use strict';

/**
 * @imports
 */
var assert = require('assert');

/**
 * @private
 */
describe('lambda-uploader', function() {

    process.env.LAMBDA_UPLOADER_TEST = true;

    var lambdaUploader = null;

    it('require: requires without error', function(done) {
        lambdaUploader = require('../index');

        // Override the call to upload function so that we don't actually upload a test zip
        lambdaUploader.lambda.uploadFunction = function(options, cb) {
            cb();
        };

        done();
    });

    it('uploadFunction: calls the AWS config update with the specified region', function(done) {
        var testRegion = "not-a-real-region";

        var oldUpdate = lambdaUploader.AWS.config.update;
        lambdaUploader.AWS.config.update = function(config) {
            lambdaUploader.AWS.config.update = oldUpdate;

            assert.equal(config.region, testRegion);
            done();
        };

        lambdaUploader.uploadFunction(testRegion);
    });

    it('uploadFunction: calls the Lambda SDK uploadFunction method', function(done) {
        var name = "lambda-" + new Date().getTime(),
            directoryPath = "./test",
            handler = "index.handler",
            role = "fake ARN",
            memory = 512,
            timeout = 30;

        var called = false;
        var oldUploadFunction = lambdaUploader.lambda.uploadFunction;
        lambdaUploader.lambda.uploadFunction = function(options, cb) {
            lambdaUploader.lambda.uploadFunction = oldUploadFunction;

            assert.equal(options.FunctionName, name);
            assert.notEqual(options.FunctionZip, null);
            assert.notEqual(options.FunctionZip, undefined);
            assert.equal(options.Handler, handler);
            assert.equal(options.Mode, 'event');
            assert.equal(options.Role, role);
            assert.equal(options.Runtime, 'nodejs4.3');
            assert.equal(options.MemorySize, memory);
            assert.equal(options.Timeout, timeout);

            called = true;
            cb();
        };

        lambdaUploader.uploadFunction("us-east-1", name, directoryPath, handler, role, memory, timeout, function(err) {
            if (err) {
                return done(err);
            }

            assert.equal(called, true);
            done();
        });
    });

    it('uploadFunction: deletes the generated zip file', function(done) {
        var zipFilePath = null;

        var oldCreateWriteStream = lambdaUploader.fs.createWriteStream;
        lambdaUploader.fs.createWriteStream = function(path) {
            lambdaUploader.fs.createWriteStream = oldCreateWriteStream;
            zipFilePath = path;
            return lambdaUploader.fs.createWriteStream(path);
        };

        var called = false;
        var oldUnlink = lambdaUploader.fs.unlink;
        lambdaUploader.fs.unlink = function(path, cb) {
            lambdaUploader.fs.unlink = oldUnlink;
            assert.equal(zipFilePath, path);
            called = true;
            return lambdaUploader.fs.unlink(path, cb);
        };

        var name = "lambda-" + new Date().getTime(),
            directoryPath = "./test",
            handler = "index.handler",
            role = "fake ARN",
            memory = 512,
            timeout = 30;
        lambdaUploader.uploadFunction("us-east-1", name, directoryPath, handler, role, memory, timeout, function(err) {
            if (err) {
                return done(err);
            }

            assert.equal(called, true);
            done();
        });
    });

});
