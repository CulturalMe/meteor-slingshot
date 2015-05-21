Meteor edgee:slingshot-google-cloud
===================================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/CulturalMe/meteor-slingshot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Direct and secure file-uploads to Google Cloud Storage using
[edgee:slingshot](https://github.com/CulturalMe/meteor-slingshot).


## Install

```bash
meteor add edgee:slingshot-google-cloud
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

  Slingshot.createDirective("myFileUploads", Slingshot.GoogleCloud, {
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

[Generate a private key](http://goo.gl/kxt5qz) and convert it to a `.pem` file
using openssl:

```
openssl pkcs12 -in google-cloud-service-key.p12 -nodes -nocerts > google-cloud-service-key.pem
```

Save this file into the `/private` directory of your meteor app.

### [Meteor.settings](http://docs.meteor.com/#/full/meteor_settings)

```json
{
  "GoogleAccessId": "Enter your access id (it looks like an email address)",

  "GoogleSecretKey":  "Paste the contents of the private/google-cloud-service-key.pem here"
}
```

### Code


```JavaScript
//Set default, globally for all directives:

Slingshot.GoogleCloud.directiveDefault.GoogleAccessId = "Enter your access id (it looks like an email address)";
Slingshot.GoogleCloud.directiveDefault.GoogleSecretKey = Assets.getText('google-cloud-service-key.pem');

//Or set it for a single directive:

Slingshot.createDirective("myFileUploads", Slingshot.GoogleCloud, {

  GoogleAccessId: "Enter your access id (it looks like an email address)",

  GoogleSecretKey: Assets.getText('google-cloud-service-key.pem'),

  bucket: "mybucket",

  // Uploaded files are publicly readable:
  acl: "public-read",

  authorize: function () {
    ...
  },

  // Store files into a directory by the current users username:

  key: function (file) {
    ...
  }
});

```

## Setup CORS

```
wget https://raw.githubusercontent.com/CulturalMe/meteor-slingshot/master/docs/gs-cors.json
gsutil cors set gs-cors.json gs://mybucket
```

## API Reference

### Directives

In addition to all [standard edgee:slingshot parameters](https://github.com/CulturalMe/meteor-slingshot#directives),
`edgee:slingshot-google-cloud` takes to following parameters:

`bucket` String (**required**) - Name of bucket to use. The default is
`Meteor.settings.GoogleCloudBucket`.

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
