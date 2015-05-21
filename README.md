Meteor edgee:slingshot
======================

[![](https://api.travis-ci.org/CulturalMe/meteor-slingshot.svg)](https://travis-ci.org/CulturalMe/meteor-slingshot)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/CulturalMe/meteor-slingshot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Direct and secure file-uploads to AWS S3, Google Cloud Storage and others.

## Install

For AWS S3 ([docs](services/edgee:slingshot-s3)):

```bash
meteor add edgee:slingshot-s3
```

For Google Cloud Storage ([docs](services/edgee:slingshot-google-cloud)):

```bash
meteor add edgee:slingshot-google-cloud
```

For Rackspace Cloud Files ([docs](services/edgee:slingshot-rackspace)):

```bash
meteor add edgee:slingshot-rackspace
```

<!-- Add your slingshot package here -->

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

## Update to Version 0.8.0

Cloud-specific libraries have been moved into dedicated pacakges.

You will need to add to respective package that you are using.

(i.e. For AWS S3 use `edgee:slingshot-s3`)

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
    //if we are uploading an image, pass true to download the image into cache
    //this will preload the image before using the remote image url.
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

## Adding Support for other storage Services (Advanced)

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
   * Here you can set default parameters that your service will use
   */

  directiveDefault: {
    options: {}
  },


  /**
   *
   * @param {Object} method - This is the Meteor Method context.
   * @param {Object} directive - All the parameters from the directive.
   * @param {Object} file - Information about the file as gathered by the
   * browser
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

`authorize`: Function (**required** unless set in File Restrictions)

`maxSize`: Number (**required** unless set in File Restrictions)

`allowedFileTypes` RegExp, String or Array (**required** unless set in File
Restrictions)

`cdn` String (optional) - CDN domain for downloads.
i.e. `"https://d111111abcdef8.cloudfront.net"`

`expire` Number (optional) - Number of milliseconds in which an upload
authorization will expire after the request was made. Default is 5 minutes.

### File restrictions

`authorize` Function (optional) - Function to determines if upload is allowed.

`maxSize` Number (optional) - Maximum file-size (in bytes). Use `null` or `0`
for unlimited.

`allowedFileTypes` RegExp, String or Array (optional) - Allowed MIME types. Use
null for any file type.
