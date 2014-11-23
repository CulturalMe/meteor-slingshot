meteor-slingshot
================

Direct and secure file-uploads to s3 and other cloud storage services.

## Why?

There are many many packages out there that allow file uploads to S3 and other
cloud storage services, but they usually rely on the meteor apps' server to
relay the files to the cloud service, which puts the server under unnecessary
load.

meteor-slingshot uploads the files directly to the cloud service from the
browser without ever exposing your secret access key or any other sensitive data
to the client and without requiring public write access to cloud storage to the
entire public.

File uploads can not only be restricted by file-size and file-type, but also by
other stateful criteria such as the current meteor user.

## Simple AWS S3 example


### Client side

On the client side we can now upload files through to the bucket:

```JavaScript
var uploader = Slingshot.upload("myFileUploads");

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

  authorize: function () {
    //Deny uploads if user is not logged in.
    if (!this.userId) {
      var message = "Please login before posting files";
      throw new Meteor.Error("Login Required", message);
    }
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


## Setup

Install the package:

meteor add edgee:slingshot

### AWS S3

You will need a`AWSAccessKeyId` and `AWSSecretAccessToken`.




