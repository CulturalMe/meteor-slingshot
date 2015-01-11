meteor-slingshot
================

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
  Meteor.users.update(Meteor.userId(), {$push: {"profile.files": downloadUrl}});
});
```

### Server side

On the server we declare a directive that controls upload access rules:

```JavaScript
Slingshot.createDirective("myFileUploads", Slingshot.S3Storage, {
  bucket: "mybucket",
  allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],
  maxSize: 0,
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

This directive will not allow any files other than images to be uploaded. The
policy is directed by the meteor app server and enforced by AWS S3.

## Client side validation

On both client and server side we declare file restrictions for our directive:

```Javascript
Slingshot.fileRestrictions("myFileUploads", {
  allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],
  maxSize: 1*0x400*0x400, //1MB,
  authorize: function() {
    return this.userId
  }
});
```

Now Slingshot will validate the file before sending the authorization request to the server.


### Manual validation
```JavaScript
var uploader = new Slingshot.Upload("myFileUploads");

var error = uploader.validate(document.getElementById('input').files[0]);
if (error) {
  console.error(error);
}
```

The validate method will return `null` if valid and returns an `Error instance` if validation fails.


## Storage services

The client side is agnostic to which storage service is used. All it
needs, is a directive name.

There is no limit imposed on how many directives can be declared for each
storage service.

## Progress bars

For progress bars of the upload use:

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

## Show uploaded image before it is uploaded (latency compensation)

```handlebars
<template name="myPicture">
  <img src={{url}}/>
</template>
```

```JavaScript
Template.myPicture.helpers({
  url: function () {
    //pass true to download the image into cache (preload) before using it.
    return this.uploader.url(true);
  }
});
```

This will use [Blob URLs](http://caniuse.com/#feat=bloburls) to show the image
from the local source until it is uploaded to the server. If Blob URL's are not
available it will attempt to use `FileReader` to generate a base64-encoded url
representing the data as a fallback.

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

In order to obtain your `RackspaceMetaDataKey` you need an
[auth-token](http://docs.rackspace.com/loadbalancers/api/v1.0/clb-getting-started/content/Generating_Auth_Token.html)
and then follow the
[instructions here](http://docs.rackspace.com/files/api/v1/cf-devguide/content/Set_Account_Metadata-d1a666.html).

For your container you need container and provide its name and region.

```JavaScript
Slingshot.createDirective("google-cloud-example", Slingshot.RackspaceFIles, {
  container: "myContainer", //Container name
  region: "lon3", //Region code. The default is 'iad3'

  pathPrefix: function (file) {
    //Store file into a directory by the user's username.
    var user = Meteor.users.findOne(this.userId);
    return user.username;
  }
});
```

To setup CORS use:

```bash
curl -I -X HEAD -H 'X-Auth-Token: yourAuthToken' \
  -H 'X-Container-Meta-Access-Control-Allow-Origin: *' \
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

## Dependencies

Meteor core packages:

 * underscore
 * tracker
 * reactive-var
 * check

## API Reference

### Directives

#### General

`authorize`: Function (**required** unless set in File Restrictions)

`maxSize`: Number (**required** unless set in File Restrictions)

`allowedFileTypes` RegExp, String or Array (**required** unless set in File
Restrictions)

`cdn` String (optional) - CDN domain for downloads.
i.e. `"https://d111111abcdef8.cloudfront.net"`

`expire` Number (optional) - Number of milliseconds in which an upload
authorization will expire after the request was made. Default is 5 minutes.

#### AWS S3 and Google Cloud

`bucket` String (**required**) - Name of bucket to use.
For Google Cloud the default is `Meteor.settings.GoogleCloudBucket`. For AWS S3
the default bucket is `Meteor.settings.S3Bucket`.

`bucketUrl` String or Function (optional) - Override URL to which files are
 uploaded. If it is a function, then the first argument is the bucket name. This
 url also used for downloads unless a cdn is given.

`key` String or Function (**required**) - Name of the file on the cloud storage
service. If a function is provided, it will be called with `userId` in the
context and its return value is used as the key. First argument is file info and
the second is the meta-information that can be passed by the client.

`acl` String (optional)

`cacheControl` String (optional) - RFC 2616 Cache-Control directive

`contentDisposition` String (optional) - RFC 2616 Content-Disposition directive.
Default is the uploaded file's name (inline). Use null to disable.

`bucket` String (required) - Name of bucket to use. Google Cloud it default is
`Meteor.settings.GoogleCloudBucket`. For AWS S3 the default bucket is
`Meteor.settings.S3Bucket`.

#### AWS S3 specific

`AWSAccessKeyId` String (**required**) - Can also be set in `Meteor.settings`.

`AWSSecretAccessKey` String (required) - Can also be set in `Meteor.settings`.

#### Google Cloud Storage specific

`GoogleAccessId` String (**required**) - Can also be set in `Meteor.settings`.

`GoogleSecretKey` String (**required**) - Can also be set in `Meteor.settings`.

#### Rackspace Cloud Files

`container` String (**required**) - Name of container to use.

`region` String (optional) - The region used by your container. The default is
`iad3`.

`pathPrefix` String or Function (**required**) - Prefix or directory in which files
 are stored. The rest is taken from the uploaded file's name and cannot be
 enforced. If a function is provided, it will be called with `userId` in the
 context and its return value is used as the key. First argument is file info
 and the second is the meta-information that can be passed by the client.

`RackspaceAccountId` String (**required**) - This is your rackspace account number.
It can also be set set in `Meteor.settings`.

`RackspaceMetaDataKey` String (**required**) - Can also be set in `Meteor.settings`.

### File restrictions

`authorize`: Function (optional) - Function to determines if upload is allowed.

`maxSize`: Number (optional) - Maximum file-size (in bytes). Use `null` or `0`
for unlimited.

`allowedFileTypes` RegExp, String or Array (optional) - Allowed MIME types. Use
null for any file type. **Warning: This is not enforced on rackspace**
