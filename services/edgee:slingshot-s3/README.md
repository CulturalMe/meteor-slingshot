Meteor edgee:slingshot-s3
=========================

[![](https://api.travis-ci.org/CulturalMe/meteor-slingshot.svg)](https://travis-ci.org/CulturalMe/meteor-slingshot)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/CulturalMe/meteor-slingshot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Direct and secure file-uploads to AWS S3 using
[edgee:slingshot](https://github.com/CulturalMe/meteor-slingshot).


## Install

```bash
meteor add edgee:slingshot-s3
```

## Features

 * [Upload files directly and securely from the browser](https://github.com/CulturalMe/meteor-slingshot#why)
 * [Progress bars](https://github.com/CulturalMe/meteor-slingshot#progress-bars)
 * [Latency compensation](https://github.com/CulturalMe/meteor-slingshot#show-uploaded-file-before-it-is-uploaded-latency-compensation)

## Quick Example

On the client side we can now upload files through to the bucket:

```JavaScript

// Tell client and server what the file limitations are:

Slingshot.fileRestrictions("myFileUploads", {
  //Only images are allowed
  allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],

  //Maximum file size:
  maxSize: 10 * 1024 * 1024 // 10 MB (use null for unlimited)
});

if (Meteor.isClient) {
  var uploader = new Slingshot.Upload("myFileUploads");

  uploader.send(document.getElementById('input').files[0], function (error, downloadUrl) {
    if (error) {
      // Log service detailed response
      console.error('Error uploading', uploader.xhr.response);
      alert (error);
    }
    else {
      Meteor.users.update(Meteor.userId(), {$push: {"profile.files": downloadUrl}});
    }
  });
}

if (Meteor.isServer) {
  // It is recommendable to not expose this server-side code the client,
  // by placing it in the `server` directory instead.

  Slingshot.createDirective("myFileUploads", Slingshot.S3Storage, {
    bucket: "mybucket",

    // Uploaded files are publicly readable:
    acl: "public-read",

    // Deny uploads if user is not logged in:
    authorize: function () {

      if (!this.userId) {
        var message = "Please login before posting files";
        throw new Meteor.Error("Login Required", message);
      }

      return true;
    },

    // Store files into a directory by the current users username:

    key: function (file) {
      //Store file into a directory by the user's username.
      var user = Meteor.users.findOne(this.userId);
      return user.username + "/" + file.name;
    }
  });
}
```

## Configuration

### [Meteor.settings](http://docs.meteor.com/#/full/meteor_settings)

```json
{
  "AWSAccessKeyId": "enter your key id here",
  "AWSSecretAccessKey": "enter your secret access key here"
}
```

### Code

```JavaScript
//Set default, globally for all directives:

Slingshot.S3Storage.directiveDefault.AWSAccessKeyId = "enter your key id here";
Slingshot.S3Storage.directiveDefault.AWSSecretAccessKey = "enter your secret access key here";

//Or set it for a single directive:

Slingshot.createDirective("myFileUploads", Slingshot.S3Storage, {

  AWSAccessKeyId: "enter your key id here",
  AWSSecretAccessKey: "enter your secret access key here",

  bucket: "mybucket",

  authorize: function () {
    ...
  },

  key: function (file) {
    ...
  }
});

```

### CORS Setup

For uploads to work, your bucket will need the following CORS
configuration ([instructions](http://docs.aws.amazon.com/AmazonS3/latest/UG/EditingBucketPermissions.html)):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```

### Bucket Permissions

The following bucket permissions are required:

 * `s3:PutObject`

You could use this policy, but you may want to create one that is more permissive:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "statement1",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::Account-ID:user/Dave"
            },
            "Action": ["s3:PutObject"],
            "Resource": "arn:aws:s3:::examplebucket"
        }
    ]
}
```

## Advanced use with temporary credentials

(These examples will require you to have the AWS SDK on the server, which
this package itself does not depend on)

For extra security you can use
[temporary credentials](http://docs.aws.amazon.com/STS/latest/UsingSTS/CreatingSessionTokens.html) to sign upload requests.

```JavaScript
var sts = new AWS.STS(); // Using the AWS SDK to retrieve temporary credentials

Slingshot.createDirective('myUploads', Slingshot.S3Storage.TempCredentials, {
  bucket: 'myBucket',
  temporaryCredentials: Meteor.wrapAsync(function (expire, callback) {
    //AWS dictates that the minimum duration must be 900 seconds:
    var duration = Math.max(Math.round(expire / 1000), 900);

    sts.getSessionToken({
        DurationSeconds: duration
    }, function (error, result) {
      callback(error, result && result.Credentials);
    });
  })
});
```

If you are running slingshot on an EC2 instance, you can conveniently retrieve
your access keys with [`AWS.EC2MetadataCredentials`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2MetadataCredentials.html):

```JavaScript
var credentials = new AWS.EC2MetadataCredentials();

var updateCredentials = Meteor.wrapAsync(credentials.get, credentials);

Slingshot.createDirective('myUploads', Slingshot.S3Storage.TempCredentials, {
  bucket: 'myBucket',
  temporaryCredentials: function () {
    if (credentials.needsRefresh()) {
      updateCredentials();
    }

    return {
      AccessKeyId: credentials.accessKeyId,
      SecretAccessKey: credentials.secretAccessKey,
      SessionToken: credentials.sessionToken
    };
  }
});
```

## API Reference

### Directives

In addition to all [standard edgee:slingshot parameters](https://github.com/CulturalMe/meteor-slingshot#directives),
`edgee:slingshot-s3` takes to following parameters:

#### Common

`region` String (optional) - Default is `Meteor.settings.AWSRegion` or
"us-east-1". [See AWS Regions](http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region)

`bucket` String (**required**) - Name of bucket to use. The default bucket is
`Meteor.settings.S3Bucket`.

`bucketUrl` String or Function (optional) - Override URL to which files are
 uploaded. If it is a function, then the first argument is the bucket name. This
 url also used for downloads unless a cdn is given.

`key` String or Function (**required**) - Name of the file on the cloud storage
service. If a function is provided, it will be called with `userId` in the
context and its return value is used as the key. First argument is file info and
the second is the meta-information that can be passed by the client.

`acl` String (optional)

`cacheControl` String (optional) - RFC 2616 Cache-Control directive

`contentDisposition` String or Function (optional) - RFC 2616
Content-Disposition directive. Default is the uploaded file's name (inline). If
it is a function then it takes the same context and arguments as the `key`
function. Use null to disable.


#### `Slingshot.S3Storage`

`AWSAccessKeyId` String (**required**) - Can also be set in `Meteor.settings`.

`AWSSecretAccessKey` String (**required**) - Can also be set in `Meteor.settings`.

#### `Slingshot.S3Storage.TempCredentials`

`temporaryCredentials` Function (**required**) - Function that generates temporary
credentials. It takes a signle argument, which is the minumum desired expiration
time in milli-seconds and it returns an object that contains `AccessKeyId`,
`SecretAccessKey` and `SessionToken`.
