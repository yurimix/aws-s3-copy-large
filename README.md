# aws-s3-copy-large
Copy large AWS S3 objects (more than 5 GB) from one container to another

Because AWS has limitations to copy large objects (more than 5G) from one bucket to anothier,
this core decides this issue using multipart upload on a fly.

You can get, copy, modify the code as you wish without any warranties.

Usage:

```
const s3copy = require('s3_copy');

s3copy.copyObject(sourceBucket, sourceObject, destinationBucket, destinationObject).then(res => {
   // handle success
}, err => {
   // handle errors
});

```
