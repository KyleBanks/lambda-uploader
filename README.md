# lambda-uploader

A Node.js module for uploading a source directory to [AWS Lambda](https://aws.amazon.com/lambda/) as a function. 

## Installation
```
npm install lambda-uploader
```

## Example

Assuming you have a folder called `/path/to/lambda-function` that contains the source code and dependencies of a Lambda function:

```node
var lambdaUploader = require('lambda-uploader');

lambdaUploader.uploadFunction(

    'us-east-1',
    'my-awesome-function', // Function Name
    '/path/to/lambda-function', // Lambda Function Source Directory
    'index.handler', // Handler Name
    '<Lambda Execution Role ARN>', 
    512, // Memory in Megabytes
    30, // Timeout in Seconds
    
    function(err) {
        if (err) {
            throw err;
        }
        
        console.log("Lambda function uploaded!");
    }
);

```

## Notes

- If a function exists with the name provided, the function will be updated. Otherwise, a new Lambda function will be created.