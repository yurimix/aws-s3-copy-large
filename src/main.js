'use strict';

var s3copy = require('./s3_copy');

var args = process.argv.slice(2);
var params = {
    srcBucket: undefined,
    srcKey: undefined,
    dstBucket: undefined,
    dstKey: undefined
};

for (let i = 0; i<args.length; i++) {
    let arg = args[i].split('=');
    let argName = arg[0];
    let argValue = arg[1];
    switch(argName ) {
        case '--src-bucket':
            params.srcBucket = argValue;
            break;
        case '--src-key':
            params.srcKey = argValue;
            break;
        case '--dst-bucket':
            params.dstBucket = argValue;
            break;
        case '--dst-key':
            params.dstKey = argValue;
            break;
    }
}

if (Object.values(params).some(val => !val)) {
    let cmd = process.argv[1].replace(/^.*(\\|\/|\:)/, '');
    console.log('One or more of input parameters were missed.');
    console.log('Usage:', 'node', cmd, '<parameter=value [parameter=value]>');
    console.log('Parameters:');
    console.log('\t--src-bucket - source bucket name');
    console.log('\t--src-key - key of object in the source bucket');
    console.log('\t--dst-bucket - destination bucket name');
    console.log('\t--dst-key - key of object in the destination bucket');
    process.exit(1);
}

s3copy.copyObject(params.srcBucket, params.srcKey, params.dstBucket, params.dstKey).then(res => {
    console.log('Object copied', res);
}).catch(err => {
    console.log('Coping errory', err);
});
