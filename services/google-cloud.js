//GoogleCloud is based on the very same api as AWS S3, so we extend it:

Slingshot.GoogleCloud = _.defaults({

  accessId: "GoogleAccessId",
  secretKey: "GoogleSecretKey",

  directiveMatch: _.chain(Slingshot.S3Storage.directiveMatch)
    .omit(Slingshot.S3Storage.accessId, Slingshot.S3Storage.secretKey)
    .extend({
      GoogleAccessId: String,
      GoogleSecretKey: String,

      acl: Match.Optional(Match.Where(function (acl) {
        check(acl, String);

        return [
            "project-private",
            "private",
            "public-read",
            "public-read-write",
            "authenticated-read",
            "bucket-owner-read",
            "bucket-owner-full-control"
          ].indexOf(acl) >= 0;
      }))
    })
    .value(),

  directiveDefault:  _.chain(Meteor.settings)
    .pick("GoogleAccessId")
    .extend(Slingshot.S3Storage.directiveDefault, {
      bucketUrl: function (bucket) {
        return "https://" + bucket + ".storage.googleapis.com";
      }
    })
    .omit(Slingshot.S3Storage.accessId, Slingshot.S3Storage.secretKey)
    .value(),

  /**
   * @param {String} secretKey - pem private key
   * @param {String} policy
   * @returns {*|String}
   */

  sign: function (secretKey, policy) {
    return Npm.require("crypto")
      .createSign('RSA-SHA256')
      .update(policy)
      .sign(secretKey, "base64");
  }
}, Slingshot.S3Storage);
