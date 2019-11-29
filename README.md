# aws-s3-copy-large
Copy large AWS S3 objects from one bucket to another

Because AWS has limitations to copy large objects (more than 5G) from one bucket to another,
this utility decides this issue using multipart upload on a fly.

The utility also copies S3 source object metadata and tags.

Usage:
```
var s3copy = require('s3_copy');

s3copy.copyObject(sourceBucket, sourceObject, destinationBucket, destinationObject).then(res => {
   // handle success
}, err => {
   // handle errors
});

```


