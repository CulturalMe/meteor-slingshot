meteor-slingshot
================

[![](https://api.travis-ci.org/CulturalMe/meteor-slingshot.svg)](https://travis-ci.org/CulturalMe/meteor-slingshot) [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/CulturalMe/meteor-slingshot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Direct and secure file-uploads to AWS S3, Google Cloud Storage and others.

## Install

```bash
meteor add edgee:slingshot
```

## Why?

There are many many packages out there that allow file uploads to S3,
Google Cloud and other cloud storage services, but they usually rely on the
meteor apps' server to relay the files to the cloud service, which puts the
server under unnecessary load.

meteor-slingshot uploads the files directly to the cloud service from the
browser without ever exposing your secret access key or any other sensitive data
to the client and without requiring public write access to cloud storage to the
entire public.

<img src="https://cdn.rawgit.com/CulturalMe/meteor-slingshot/master/docs/slingshot.png"/>

File uploads can not only be restricted by file-size and file-type, but also by
other stateful criteria such as the current meteor user.

## Quick Example

### Client side

On the client side we can now upload files through to the bucket:

```JavaScript
var uploader = new Slingshot.Upload("myFileUploads");

uploader.send(document.getElementById('input').files[0], function (error, downloadUrl) {
  if (error) {
    // Log service detailed response.
    console.error('Error uploading', uploader.xhr.response);
    alert (error);
  }
  else {
    Meteor.users.update(Meteor.userId(), {$push: {"profile.files": downloadUrl}});
  }
});
```

### Client and Server

These file upload restrictions are validated on the client and then appended to
the directive on the server side to enforce them:

```JavaScript
Slingshot.fileRestrictions("myFileUploads", {
  allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],
  maxSize: 10 * 1024 * 1024 // 10 MB (use null for unlimited).
});
```

Important: The `fileRestrictions` must be declared before the the directive is instantiated.

### Server side

On the server we declare a directive that controls upload access rules:

```JavaScript
Slingshot.createDirective("myFileUploads", Slingshot.S3Storage, {
  bucket: "mybucket",

  acl: "public-read",

  authorize: function () {
    //Deny uploads if user is not logged in.
    if (!this.userId) {
      var message = "Please login before posting files";
      throw new Meteor.Error("Login Required", message);
    }

    return true;
  },

  key: function (file) {
    //Store file into a directory by the user's username.
    var user = Meteor.users.findOne(this.userId);
    return user.username + "/" + file.name;
  }
});
```

With the directive above, no other files than images will be allowed. The
policy is directed by the meteor app server and enforced by AWS S3.

Note: If your bucket is created in any region other than `US Standard`, you will need to set the `region` key in the directive. Refer the [AWS Slingshot Storage Directives](#aws-s3-slingshots3storage)

## Storage services

The client side is agnostic to which storage service is used. All it
needs for the file upload to work, is a directive name.

There is no limit imposed on how many directives can be declared for each
storage service.

Storage services are pluggable in Slingshot and you can add support for own
storage service as described in a section below.

## Progress bars

You can create file upload progress bars as follows:

```handlebars
<template name="progressBar">
  <div class="progress">
    <div class="progress-bar" role="progressbar" aria-valuenow="{{progress}}" aria-valuemin="0" aria-valuemax="100" style="width: {{progress}}%;">
      <span class="sr-only">{{progress}}% Complete</span>
    </div>
  </div>
</template>
```

Using the `Slingshot.Upload` instance read and react to the progress:

```JavaScript
Template.progressBar.helpers({
  progress: function () {
    return Math.round(this.uploader.progress() * 100);
  }
});
```

## Show uploaded file before it is uploaded (latency compensation)

```handlebars
<template name="myPicture">
  <img src={{url}}/>
</template>
```

```JavaScript
Template.myPicture.helpers({
  url: function () {
    //If we are uploading an image, pass true to download the image into cache.
    //This will preload the image before using the remote image url.
    return this.uploader.url(true);
  }
});
```

This to show the image from the local source until it is uploaded to the server.
If Blob URL's are not available it will attempt to use `FileReader` to generate
a base64-encoded url representing the data as a fallback.

## Add meta-context to your uploads

You can add meta-context to your file-uploads, to make your requests more
specific on where the files are to be uploaded.

Consider the following example...

We have an app that features picture albums. An album belongs to a user and
only that user is allowed to upload picture to it. In the cloud each album has
its own directory where its pictures are stored.

We declare our client-side uploader as follows:

```JavaScript
var metaContext = {albumId: album._id}
var uploadToMyAlbum = new Slingshot.Upload("picturealbum", metaContext);
```

On the server side the directive can now set the key accordingly and check if
the user is allowed post pictures to the given album:

```JavaScript
Slingshot.createDirective("picturealbum", Slingshot.GoogleCloud, {
  acl: "public-read",

  authorize: function (file, metaContext) {
    var album = Albums.findOne(metaContext.albumId);

    //Denied if album doesn't exist or if it is not owned by the current user.
    return album && album.userId === this.userId;
  },

  key: function (file, metaContext) {
    return metaContext.albumId + "/" + Date.now() + "-" + file.name;
  }
});
```
## Manual Client Side  validation

You can check if a file uploadable according to file-restrictions as follows:

```JavaScript
var uploader = new Slingshot.Upload("myFileUploads");

var error = uploader.validate(document.getElementById('input').files[0]);
if (error) {
  console.error(error);
}
```

The validate method will return `null` if valid and returns an `Error` instance
if validation fails.


### AWS S3

You will need a`AWSAccessKeyId` and `AWSSecretAccessKey` in `Meteor.settings`
and a bucket with the following CORS configuration:

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

Declare AWS S3 Directives as follows:

```JavaScript
Slingshot.createDirective("aws-s3-example", Slingshot.S3Storage, {
  //...
});
```

#### S3 with temporary AWS Credentials (Advanced)

For extra security you can use
[temporary credentials](http://docs.aws.amazon.com/STS/latest/UsingSTS/CreatingSessionTokens.html) to sign upload requests.

```JavaScript
var sts = new AWS.STS(); // Using the AWS SDK to retrieve temporary credentials.

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

If you are running slingshot on an EC2 instance, you can conveniantly retreive
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

### Google Cloud

[Generate a private key](http://goo.gl/kxt5qz) and convert it to a `.pem` file
using openssl:

```
openssl pkcs12 -in google-cloud-service-key.p12 -nodes -nocerts > google-cloud-service-key.pem
```

Setup CORS on the bucket:

```
gsutil cors set docs/gs-cors.json gs://mybucket
```

Save this file into the `/private` directory of your meteor app and add this
line to your server-side code:

```JavaScript
Slingshot.GoogleCloud.directiveDefault.GoogleSecretKey = Assets.getText('google-cloud-service-key.pem');
```
Declare Google Cloud Storage Directives as follows:

```JavaScript
Slingshot.createDirective("google-cloud-example", Slingshot.GoogleCloud, {
  //...
});
```

### Rackspace Cloud Files

You will need a`RackspaceAccountId` (your acocunt number) and
`RackspaceMetaDataKey` in `Meteor.settings`.

In order to obtain your `RackspaceMetaDataKey` (a.k.a. Account-Meta-Temp-Url-Key)
you need an
[auth-token](http://docs.rackspace.com/loadbalancers/api/v1.0/clb-getting-started/content/Generating_Auth_Token.html)
and then follow the
[instructions here](http://docs.rackspace.com/files/api/v1/cf-devguide/content/Set_Account_Metadata-d1a666.html).

Note that API-Key, Auth-Token, Meta-Data-Key are not the same thing:

API-Key is what you need to obtain an Auth-Token, which in turn is what you need
to setup CORS and to set your Meta-Data-Key. The auth-token expires after 24 hours.

For your directive you need container and provide its name, region and cdn.

```JavaScript
Slingshot.createDirective("rackspace-files-example", Slingshot.RackspaceFiles, {
  container: "myContainer", //Container name.
  region: "lon3", //Region code (The default would be 'iad3').

  //You must set the cdn if you want the files to be publicly accessible:
  cdn: "https://abcdefghije8c9d17810-ef6d926c15e2b87b22e15225c32e2e17.r19.cf5.rackcdn.com",

  pathPrefix: function (file) {
    //Store file into a directory by the user's username.
    var user = Meteor.users.findOne(this.userId);
    return user.username;
  }
});
```

To setup CORS you also need to your Auth-Token from above and use:

```bash
curl -I -X POST -H 'X-Auth-Token: yourAuthToken' \
  -H 'X-Container-Meta-Access-Control-Allow-Origin: *' \
  -H 'X-Container-Meta-Access-Expose-Headers: etag location x-timestamp x-trans-id Access-Control-Allow-Origin' \
  https://storage101.containerRegion.clouddrive.com/v1/MossoCloudFS_yourAccoountNumber/yourContainer
```

## Browser Compatibility

Currently the uploader uses `XMLHttpRequest 2` to upload the files, which is not
supported on Internet Explorer 9 and older versions of Internet Explorer.

This can be circumvented by falling back to iframe uploads in future versions,
if required.

Latency compensation is available in Internet Explorer 10.

## Security

The secret key never leaves the meteor app server. Nobody will be able to upload
anything to your buckets outside of your meteor app.

Instead of using secret access keys, Slingshot uses a policy document that is
sent to along with the file AWS S3 or Google Cloud Storage. This policy is
signed by the secret key and contains all the restrictions that you define in
the directive. By default a signed policy expires after 5 minutes.

## Adding Support for other storage Services

Cloud storage services are pluggable in Slingshot. You can add support for a
cloud storage service of your choice. All you need is to declare an object
with the following parameters:

```JavaScript
MyStorageService = {

  /**
   * Define the additional parameters that your your service uses here.
   *
   * Note that some parameters like maxSize are shared by all services. You do
   * not need to define those by yourself.
   */


  directiveMatch: {
    accessKey: String,

    options: Object,

    foo: Match.Optional(Function)
  },

  /**
   * Here you can set default parameters that your service will use.
   */

  directiveDefault: {
    options: {}
  },


  /**
   *
   * @param {Object} method - This is the Meteor Method context.
   * @param {Object} directive - All the parameters from the directive.
   * @param {Object} file - Information about the file as gathered by the
   * browser.
   * @param {Object} [meta] - Meta data that was passed to the uploader.
   *
   * @returns {UploadInstructions}
   */

  upload: function (method, directive, file, meta) {
    var accessKey = directive.accessKey;

    var fooData = directive.foo && directive.foo.call(method, file, meta);

    //Here you need to make sure that all parameters passed in the directive
    //are going to be enforced by the server receiving the file.

    return {
      // Endpoint where the file is to be uploaded:
      upload: "https://example.com",

      // Download URL, once the file uploaded:
      download: directive.cdn || "https://example.com/" + file.name,

      // POST data to be attached to the file-upload:
      postData: [
        {
          name: "accessKey",
          value: accessKey
        },
        {
          name: "signature",
          value: signature
        }
        //...
      ],

      // HTTP headers to send when uploading:
      headers: {
        "x-foo-bar": fooData
      }
    };
  },

  /**
   * Absolute maximum file-size allowable by the storage service.
   */

  maxSize: 5 * 1024 * 1024 * 1024
};
```

Example Directive:

```JavaScript
Slingshot.createDirective("myUploads", MyStorageService, {
  accessKey: "a12345xyz",
  foo: function (file, metaContext) {
    return "bar";
  }
});
```

## Dependencies

Meteor core packages:

 * underscore
 * tracker
 * reactive-var
 * check

## Troubleshooting and Help

If you are having any queries about how to use slingshot, or how to get it to work with
the different services or any other general questions about it, please [post a question on Stack Overflow](http://stackoverflow.com/questions/ask?tags=meteor-slingshot). You will get a high
quality answer there much quicker than by posting an issue here on github.

Bug reports, Feature Requests and Pull Requests are always welcome.

## API Reference

### Directives

#### General (All Services)

`authorize`: Function (**required** unless set in File Restrictions)

`maxSize`: Number (**required** unless set in File Restrictions)

`allowedFileTypes` RegExp, String or Array (**required** unless set in File
Restrictions)

`cdn` String (optional) - CDN domain for downloads.
i.e. `"https://d111111abcdef8.cloudfront.net"`

`expire` Number (optional) - Number of milliseconds in which an upload
authorization will expire after the request was made. Default is 5 minutes.

#### AWS S3 (`Slingshot.S3Storage`)

`region` String (optional) - Default is `Meteor.settings.AWSRegion` or
"us-east-1". [See AWS Regions](http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region)

`AWSAccessKeyId` String (**required**) - Can also be set in `Meteor.settings`.

`AWSSecretAccessKey` String (**required**) - Can also be set in `Meteor.settings`.

#### AWS S3 with Temporary Credentials (`Slingshot.S3Storage.TempCredentials`)

`region` String (optional) - Default is `Meteor.settings.AWSRegion` or
"us-east-1". [See AWS Regions](http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region)

`temporaryCredentials` Function (**required**) - Function that generates temporary
credentials. It takes a signle argument, which is the minumum desired expiration
time in milli-seconds and it returns an object that contains `AccessKeyId`,
`SecretAccessKey` and `SessionToken`.

#### Google Cloud Storage (`Slingshot.GoogleCloud`)

`bucket` String (**required**) - Name of bucket to use. The default is
`Meteor.settings.GoogleCloudBucket`.

`GoogleAccessId` String (**required**) - Can also be set in `Meteor.settings`.

`GoogleSecretKey` String (**required**) - Can also be set in `Meteor.settings`.

#### AWS S3 and Google Cloud Storage

`bucket` String (**required**) - Name of bucket to use. The default is
`Meteor.settings.GoogleCloudBucket`. For AWS S3 the default bucket is
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

#### Rackspace Cloud (`Slingshot.RackspaceFiles`)

`RackspaceAccountId` String (**required**) - Can also be set in `Meteor.settings`.

`RackspaceMetaDataKey` String (**required**) - Can also be set in `Meteor.settings`.

`container` String (**required**) - Name of container to use.

`region` String (optional) - Data Center region. The default is `"iad3"`.
[See other regions](http://docs.rackspace.com/files/api/v1/cf-devguide/content/Service-Access-Endpoints-d1e003.html)

`pathPrefix` String or Function (**required**) - Similar to `key` for S3, but
will always be appended by `file.name` that is provided by the client.

`deleteAt` Date (optional) - Absolute time when the uploaded file is to be
deleted. _This attribute is not enforced at all. It can be easily altered by the
client_

`deleteAfter` Number (optional) - Same as `deleteAt`, but relative.

### File restrictions

`authorize` Function (optional) - Function to determines if upload is allowed.

`maxSize` Number (optional) - Maximum file-size (in bytes). Use `null` or `0`
for unlimited.

`allowedFileTypes` RegExp, String or Array (optional) - Allowed MIME types. Use
null for any file type.
