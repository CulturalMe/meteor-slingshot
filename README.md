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

uploader.send(document.getElementById('input').files[0], function (error, url) {
  Meteor.users.update(Meteor.userId(), {$push: {"profile.files": url}});
});
```

### Server side

On the server we declare a directive that controls upload access rules:

```JavaScript
Slingshot.createDirective("myFileUploads", Slingshot.S3Storage, {
  bucket: "mybucket",
  allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],

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
}):
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
    return this.uploader.url():
  }
});
```

This will use [Blob URLs](http://caniuse.com/#feat=bloburls) to show the image from the local source until it is uploaded to the server. If Blob URL's are not available it will attempt to use `FileReader` to generate a base64 encoded url representing the data as a fallback.

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
Slingshot.GoogleCloud.defaultDirective.GoogleSecretKey = Assets.getText('google-cloud-service-key.pem');
```
Declare Google Cloud Storage Directives as follows:

```JavaScript
Slingshot.createDirective("google-cloud-example", Slingshot.GoogleCloud, {
  //...
});
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

`authorize`: Function (required) - Function to determines if upload is allowed.

`maxSize`: Number (required) - Maximum file-size (in bytes). Use `null` or `0`
for unlimited.

`allowedFileTypes` RegExp, String or Array (required) - Allowed MIME types. Use
null for any file type.

`cacheControl` String (optional) - RFC 2616 Cache-Control directive

`contentDisposition` String (required) - RFC 2616 Content-Disposition directive.
Default is the uploaded file's name (inline). Use null to disable.

`bucket` String (required) - Name of bucket to use. Google Cloud it default is
`Meteor.settings.GoogleCloudBucket`. For AWS S3 the default bucket is
`Meteor.settings.S3Bucket`.

`domain` String (optional) - Override domain to use to access bucket. Useful for
CDN.

`key` String or Function (required) - Name of the file on the cloud storage
service. If a function is provided, it will be called with `userId` in the
context and its return value is used as the key.

`expire` Number (optional) - Number of milliseconds in which an upload
authorization will expire after the request was made. Default is 5 minutes.

`acl` String (optional)

`AWSAccessKeyId` String (required for AWS S3) - Can also be set in
`Meteor.settings`

`AWSSecretAccessKey` String (required for AWS S3) - Can also be set in
`Meteor.settings`

`GoogleAccessId` String (required for Google Cloud Storage) - Can also be set in
`Meteor.settings`

`GoogleSecretKey` String (required for Google Cloud Storage) - Can also be set
in `Meteor.settings`
