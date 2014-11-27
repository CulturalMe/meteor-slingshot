Slingshot.S3Storage = {

  directiveMatch: {
    bucket: String,
    domain: Match.Optional(String),

    AWSAccessKeyId: String,
    AWSSecretAccessKey: String,

    acl: Match.Optional(Match.Where(function (acl) {
      check(acl, String);

      return [
        "private",
        "public-read",
        "public-read-write",
        "authenticated-read",
        "bucket-owner-read",
        "bucket-owner-full-control",
        "log-delivery-write"
      ].indexOf(acl) >= 0;
    })),

    key: Match.OneOf(String, Function),

    expire: Match.Where(function (expire) {
      check(expire, Number);

      return expire > 0;
    })
  },

  directiveDefault: _.chain(Meteor.settings)
    .pick("AWSAccessKeyId", "AWSSecretAccessKey")
    .extend({
      bucket: Meteor.settings.S3Bucket,
      expire: 5 * 60 * 1000 //in 5 minutes
    })
    .value(),

  /**
   *
   * @param {{userId: String}} method
   * @param {Directive} directive
   * @param {FileInfo} file
   * @param {Object} [meta]
   *
   * @returns {UploadInstructions}
   */

  upload: function (method, directive, file, meta) {
    var url = Npm.require("url"),
        policy = new Slingshot.StoragePolicy()
          .expireIn(directive.expire)
          .contentLength(0, Math.min(file.size, directive.maxSize)),

        payload = {
          key: _.isFunction(directive.key) ?
            directive.key.call(method, file, meta) : directive.key,

          AWSAccessKeyId: directive.AWSAccessKeyId,

          bucket: directive.bucket,

          "Content-Type": file.type,
          "acl": directive.acl,

          "Cache-Control": directive.cacheControl,
          "Content-Disposition": directive.contentDisposition
        },
        domain = {
            protocol: "https",
            host: directive.domain || directive.bucket + ".s3.amazonaws.com",
            pathname: payload.key
        };

    payload.policy = policy.match(payload).stringify();
    payload.signature = this.sign(directive.AWSSecretAccessKey, payload.policy);

    return {
      upload: url.format(_.omit(domain, "pathname")),
      download: url.format(domain),
      postData: [{
        name: "key",
        value: payload.key
      }].concat(_.chain(payload).omit("key").map(function (value, name) {
          return !_.isUndefined(value) && {
            name: name,
            value: value
          };
      }).compact().value())
    };
  },

  /**
   *
   * @param {String} secretkey
   * @param {String} policy
   * @returns {String}
   */

  sign: function (secretkey, policy) {
    /* global Buffer: false */
    return Npm.require("crypto")
      .createHmac("sha1", secretkey)
      .update(new Buffer(policy, "utf-8"))
      .digest("base64");
  }
};
