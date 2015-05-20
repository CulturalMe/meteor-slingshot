Meteor edgee:slingshot-rackspace
================================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/CulturalMe/meteor-slingshot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Direct and secure file-uploads to Rackspace Cloud Files using
[edgee:slingshot](https://github.com/CulturalMe/meteor-slingshot).


## Install

```bash
meteor add edgee:slingshot-rackspace
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

  Slingshot.createDirective("myFileUploads", Slingshot.RackspaceFiles, {
    container: "myContainer", //Container name
    region: "lon3", //Region code (The default would be 'iad3')

    //You must set the cdn if you want the files to be publicly accessible:
    cdn: "https://abcdefghije8c9d17810-ef6d926c15e2b87b22e15225c32e2e17.r19.cf5.rackcdn.com",

    pathPrefix: function (file) {
      //Store file into a directory by the user's username.
      var user = Meteor.users.findOne(this.userId);
      return user.username;
    }
  });
}
```

## Container Configuration

You will need a`RackspaceAccountId` (your account number) and
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

To setup CORS you also need to your Auth-Token from above and use:

```bash
curl -I -X POST -H 'X-Auth-Token: yourAuthToken' \
  -H 'X-Container-Meta-Access-Control-Allow-Origin: *' \
  -H 'X-Container-Meta-Access-Expose-Headers: etag location x-timestamp x-trans-id Access-Control-Allow-Origin' \
  https://storage101.containerRegion.clouddrive.com/v1/MossoCloudFS_yourAccoountNumber/yourContainer
```

## API Reference

### Directives

In addition to all [standard edgee:slingshot parameters](https://github.com/CulturalMe/meteor-slingshot#directives),
`edgee:slingshot-rackspace` takes to following parameters:

`RackspaceAccountId` String (**required**) - Can also be set in `Meteor.settings`.

`RackspaceMetaDataKey` String (**required**) - Can also be set in `Meteor.settings`.

`container` String (**required**) - Name of container to use.

`region` String (optional) - Data Center region. The default is `"iad3"`.
[See other regions](http://docs.rackspace.com/files/api/v1/cf-devguide/content/Service-Access-Endpoints-d1e003.html)

`pathPrefix` String or Function (**required**) - Prefix that is prepended to the
 the `file.name`. If it is a function, it will be called with `userId` in the
 context and its return value is used as the path-prefix. The First argument is
 file info and the second is the meta-information that can be passed by the
 client.

`deleteAt` Date (optional) - Absolute time when the uploaded file is to be
deleted. _This attribute is not enforced at all. It can be easily altered by the
client_

`deleteAfter` Number (optional) - Same as `deleteAt`, but relative.
