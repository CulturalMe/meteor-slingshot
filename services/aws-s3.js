Slingshot.S3Storage = {

  accessId: "AWSAccessKeyId",
  secretKey: "AWSSecretAccessKey",

  directiveMatch: {
    bucket: String,
    bucketUrl: Match.OneOf(String, Function),

    region: Match.Where(function (region) {
      check(region, String);

      return /^[a-z]{2}-\w+-\d+$/.test(region);
    }),

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
    }),

    cacheControl: Match.Optional(String),
    contentDisposition: Match.Optional(Match.OneOf(String, Function, null))
  },

  directiveDefault: _.chain(Meteor.settings)
    .pick("AWSAccessKeyId", "AWSSecretAccessKey")
    .extend({
      bucket: Meteor.settings.S3Bucket,
      bucketUrl: function (bucket, region) {
        var bucketDomain = "s3-" + region + ".amazonaws.com";
        if (region === "us-east-1")
          bucketDomain = "s3.amazonaws.com";
        if (region === "cn-north-1")
          bucketDomain = "s3.cn-north-1.amazonaws.com.cn";

        if (bucket.indexOf(".") !== -1)
          return "https://" + bucketDomain + "/" + bucket;

        return "https://" + bucket + "." + bucketDomain;
      },
      region: Meteor.settings.AWSRegion || "us-east-1",
      expire: 5 * 60 * 1000 //in 5 minutes
    })
    .value(),

  getContentDisposition: function (method, directive, file, meta) {
    var getContentDisposition = directive.contentDisposition;

    if (!_.isFunction(getContentDisposition)) {
      getContentDisposition = function () {
        var filename = file.name && encodeURIComponent(file.name);

        return directive.contentDisposition || filename &&
          "inline; filename=\"" + filename + "\"; filename*=utf-8''" +
          filename;
      };
    }

    return getContentDisposition.call(method, file, meta);
  },

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
    var policy = new Slingshot.StoragePolicy()
          .expireIn(directive.expire)
          .contentLength(0, Math.min(file.size, directive.maxSize || Infinity)),

        payload = {
          key: _.isFunction(directive.key) ?
            directive.key.call(method, file, meta) : directive.key,

          bucket: directive.bucket,

          "Content-Type": file.type,
          "acl": directive.acl,

          "Cache-Control": directive.cacheControl,
          "Content-Disposition": this.getContentDisposition(method, directive,
            file, meta)
        },

        bucketUrl = _.isFunction(directive.bucketUrl) ?
          directive.bucketUrl(directive.bucket, directive.region) :
          directive.bucketUrl,

        downloadUrl = [
          (directive.cdn || bucketUrl),
          payload.key
        ].map(function (part) {
            return part.replace(/\/+$/, '');
          }).join("/");

    this.applySignature(payload, policy, directive);

    return {
      upload: bucketUrl,
      download: downloadUrl,
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

  /** Applies signature an upload payload
   *
   * @param {Object} payload - Data to be upload along with file
   * @param {Slingshot.StoragePolicy} policy
   * @param {Directive} directive
   */

  applySignature: function (payload, policy, directive) {
    var now =  new Date(),
        today = now.getUTCFullYear() + formatNumber(now.getUTCMonth() + 1, 2) +
          formatNumber(now.getUTCDate(), 2),
        service = "s3";

    _.extend(payload, {
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": [
        directive[this.accessId],
        today,
        directive.region,
        service,
        "aws4_request"
      ].join("/"),
      "x-amz-date": today + "T000000Z"
    });

    payload.policy = policy.match(payload).stringify();
    payload["x-amz-signature"] = this.signAwsV4(payload.policy,
      directive[this.secretKey], today, directive.region, service);
  },

  /** Generate a AWS Signature Version 4
   *
   * @param {String} policy - Base64 encoded policy to sign.
   * @param {String} secretKey - AWSSecretAccessKey
   * @param {String} date - Signature date (yyyymmdd)
   * @param {String} region - AWS Data-Center region
   * @param {String} service - type of service to use
   * @returns {String} hex encoded HMAC-256 signature
   */

  signAwsV4: function (policy, secretKey, date, region, service) {
    var dateKey = hmac256("AWS4" + secretKey, date),
        dateRegionKey = hmac256(dateKey, region),
        dateRegionServiceKey= hmac256(dateRegionKey, service),
        signingKey = hmac256(dateRegionServiceKey, "aws4_request");

    return hmac256(signingKey, policy, "hex");
  }
};

Slingshot.S3Storage.TempCredentials = _.defaults({

  directiveMatch: _.chain(Slingshot.S3Storage.directiveMatch)
    .omit("AWSAccessKeyId", "AWSSecretAccessKey")
    .extend({
      temporaryCredentials: Function
    })
    .value(),

  directiveDefault: _.omit(Slingshot.S3Storage.directiveDefault,
    "AWSAccessKeyId", "AWSSecretAccessKey"),

  applySignature: function (payload, policy, directive) {
    var credentials = directive.temporaryCredentials(directive.expire);

    check(credentials, Match.ObjectIncluding({
      AccessKeyId: Slingshot.S3Storage.directiveMatch.AWSAccessKeyId,
      SecretAccessKey: Slingshot.S3Storage.directiveMatch.AWSSecretAccessKey,
      SessionToken: String
    }));

    payload["x-amz-security-token"] = credentials.SessionToken;

    return Slingshot.S3Storage.applySignature
      .call(this, payload, policy, _.defaults({
        AWSAccessKeyId: credentials.AccessKeyId,
        AWSSecretAccessKey: credentials.SecretAccessKey
      }, directive));
  }
}, Slingshot.S3Storage);


function formatNumber(num, digits) {
  var string = String(num);

  return Array(digits - string.length + 1).join("0").concat(string);
}

var crypto = Npm.require("crypto");

function hmac256(key, data, encoding) {
  /* global Buffer: false */
  return crypto
    .createHmac("sha256", key)
    .update(new Buffer(data, "utf-8"))
    .digest(encoding);
}
