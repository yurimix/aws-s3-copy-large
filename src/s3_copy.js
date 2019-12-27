'use strict';

const AWS = require('aws-sdk');

var s3 = new AWS.S3();

const PART_SIZE = 1024 * 1024 * 1024 * 1; //1GB
const MAX_FILE_LENGTH = 1024 * 1024 * 1024 * 5;   //5GB

module.exports = {
    copyObject: copyObject
};

function copyObject(sourceBucket, sourceObject, destinationBucket, destinationObject) {
    return getObjectAttributes(sourceBucket, sourceObject).then(attrs => {
        var copyPromise;
        if (attrs.ContentLength >= MAX_FILE_LENGTH ) {
            copyPromise = copyMultipartObject(sourceBucket, sourceObject, destinationBucket, destinationObject, attrs);
        } else {
            copyPromise = copyFullObject(sourceBucket, sourceObject, destinationBucket, destinationObject);
        }
        return copyPromise.then(copyRes => {
            return updateGrants(destinationBucket, destinationObject, attrs).then(res => {
                return copyRes;
            });
        });
    });
}

function updateGrants(bucket, object, attrs) {
    let params = {
        Bucket: bucket,
        Key: object,
        AccessControlPolicy: {
            Owner: attrs.Owner,
            Grants: attrs.Grants
        }
    };
    console.log(JSON.stringify(params));
    return s3.putObjectAcl(params).promise();
}

function getObjectAttributes(bucket, object) {
    let params = {
        Bucket: bucket,
        Key: object
    };
    
    return Promise.all([
        s3.getObjectTagging(params).promise(),
        s3.headObject(params).promise(),
        s3.getObjectAcl(params).promise()
    ]).then(res => {
        return {
            TagSet: res[0].TagSet,
            ContentLength: res[1].ContentLength,
            Metadata: res[1].Metadata,
            Grants: res[2].Grants,
            Owner: res[2].Owner
        };
    });    
}

function copyFullObject(sourceBucket, sourceObject, destinationBucket, destinationObject) {
    let params = {
        CopySource: [sourceBucket, sourceObject].join('/'),
        Bucket: destinationBucket,
        Key: destinationObject,
        TaggingDirective: 'COPY'
    };
    let time = Date.now();
    return s3.copyObject(params).promise().then(res => {
        console.log(`Full object copied in ${Date.now() - time}ms.`);
        return res;
    });
}

function copyMultipartObject(sourceBucket, sourceObject, destinationBucket, destinationObject, attrs) {

    let multipartParams = {
        Bucket: destinationBucket,
        Key: destinationObject,
        Metadata: attrs.Metadata
    };

    if (attrs.TagSet) {
        multipartParams.Tagging = attrs.TagSet.map(tag => encodeURIComponent(tag.Key) + '=' + encodeURIComponent(tag.Value)).join('&');
    }
    
    console.log('Multipart params', multipartParams);

    let multipartMap = { Parts: [] };
    let contentLength = attrs.ContentLength;
    return s3.createMultipartUpload(multipartParams).promise().then(multipart => {
        let partNum = 0;
        let partsNum = Math.ceil(contentLength / PART_SIZE);

        console.log(`Copying ${sourceBucket}/${sourceObject} to ${destinationBucket}/${destinationObject}, size ${contentLength}, parts ${partsNum}`);
    
        let chain = Promise.resolve();  
        for (let start = 0; start < contentLength; start += PART_SIZE) {
            let startByte = start === 0 ? start : start + 1;
            let endByte = start + PART_SIZE >= contentLength ? contentLength - 1 : start + PART_SIZE;
            chain = chain.then(() => {
                partNum++;
                return copyMultipartPart(sourceBucket, sourceObject, destinationBucket, destinationObject, startByte, endByte, partNum, multipart.UploadId, multipartMap);
            });
        }

        let doneParams = {
            Bucket: multipart.Bucket,
            Key: multipart.Key,
            MultipartUpload: multipartMap,
            UploadId: multipart.UploadId
        };
        return chain.then(() => {
            console.log('Completing upload', JSON.stringify(doneParams));
            return s3.completeMultipartUpload(doneParams).promise();
        });
    });
}

function copyMultipartPart(sourceBucket, sourceObject, destinationBucket, destinationObject, startByte, endByte, partNum, uploadId, multipartMap) {
    let partParams = {
        Bucket: destinationBucket,
        Key: destinationObject,
        CopySource: [sourceBucket, sourceObject].join('/'),
        CopySourceRange: ['bytes=', startByte, '-', endByte].join(''),
        PartNumber: String(partNum),
        UploadId: uploadId
    };
    console.log(`Copying part #${partNum}`, partParams);
    let time = Date.now();
    return s3.uploadPartCopy(partParams).promise().then(data => {
        multipartMap.Parts[partNum - 1] = {
            ETag: data.ETag,
            PartNumber: Number(partNum)
        };
        console.log(`Part #${partNum} copied in ${Date.now() - time}ms.`);
        return;
    });
}
