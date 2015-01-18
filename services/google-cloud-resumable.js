var GoogleCloud = Slingshot.GoogleCloud;

Slingshot.GoogleCloudResumable = _.defaults({

  credentials: {},

  maxSize: Infinity,

  directiveMatch: _.defaults({
    acl: Match.Optional(Match.Where(function (acl) {
      check(acl, String);

      return [
          "authenticatedread",
          "bucketownerfullcontrol",
          "bucketownerread",
          "private",
          "projectprivate",
          "publicread"
        ].indexOf(acl) >= 0;
    }))
  }, GoogleCloud.directiveMatch),

  upload: function (method, directive, file, meta) {
    var url = Npm.require("url"),
        endpoint = {
          protocol: "https",
          host: "www.googleapis.com",
          pathname: "/upload/storage/v1/b/" + directive.bucket + "/o"
        },
        key = this.objectName(method, directive, file, meta);

    method.unblock();

    var response = HTTP.post(url.format(endpoint), {
      headers: {
        "Authorization": "Bearer " + this.getCredentials(directive),
        "Origin": Meteor.absoluteUrl(),
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": file.length
      },
      params: {
        predefinedAcl: directive.acl,
        uploadType: "resumable"
      },
      data: {
        name: key,
        contentDisposition: this.contentDisposition(directive, file),
        cacheControl: directive.cacheControl
      }
    });

    return {
      upload: response.headers.location,
      download: this.downloadUrl(directive, key),
      headers: {
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": file.length
      },
      method: "PUT"
    };
  },

  getCredentials: function (directive) {
    var accessId = directive[this.accessId],
        tokenGenerator = this.credentials[accessId];

    if (!tokenGenerator) {
      var jwt = new oauth.Jwt({iss: accessId}, [
        "https://www.googleapis.com/auth/devstorage.full_control"
      ]);

      tokenGenerator = (this.credentials[accessId] =
        new oauth.TokenGenerator(jwt, directive[this.secretKey]));
    }

    return tokenGenerator.getToken();
  }

}, GoogleCloud);
