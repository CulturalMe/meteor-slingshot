/* global S3Policy: true */
/* global Buffer: false */

Slingshot.S3Storage = {

  directiveMatch: {
    bucket: String,

    accessKeyId: String,
    secretAccessKey: String,

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

  directiveDefault: {
    bucket: Meteor.settings.S3Bucket,
    accessKeyId: Meteor.settings.AWSAccessKeyId,
    secretAccessKey: Meteor.settings.AWSSecretAccessKey,
    expire: 5 * 60 * 1000 //in 5 minutes
  },

  /**
   *
   * @param {Directive} directive
   * @param {FileInfo} file
   * @param {Object} [meta]
   *
   * @returns {UploadInstructions}
   */

  upload: function (directive, file, meta) {
    var url = Npm.require("url"),
        policy = new S3Policy(directive.bucket),
        payload = {
          AWSAccessKeyId: directive.AWSAccessKeyId,
          "Content-Type": file.type,
          acl: directive.acl,
          key: _.isFunction(directive.key) ?
            directive.key(file, meta) : directive.key
        },
        domain = this.domain ? url.parse(this.domain) : url.format({
            protocol: "https",
            host: directive.bucket + ".s3.amazonaws.com"
        });

    policy
      .expireIn(directive.expire)
      .size(0, Math.min(file.size * 0.1, directive.maxSize)) //10% slack
      .sign(payload, directive.awsSecretAccessKey);

    domain.pathname = payload.key;

    return {
      upload: url.format(_.omit(domain, "pathname")),
      download: url.format(domain),
      payload: payload,
      dataOrder: ["key"].concat(_.keys(payload))
    };
  }
};

/** Creates an S3 file upload policy.
 *
 * This policy is useful for authorising clients to upload files directly to s3
 * without the meteor server as a proxy it through meteor and without having to
 * give everybody an open write access to the entire S3 server.
 *
 * @param {string} bucket - The name of the bucket to which the upload must go.
 * @constructor
 */

S3Policy = function (bucket) {
  check(bucket, String);

  var policy = {
    conditions: [{bucket: bucket}]
  };

  var self = this;

  _.extend(self, {

    /** Set policy expiration time (as an absolute value).
     *
     * Subsequent calls override previous expiration values.
     *
     * @param {Date} deadline
     *
     * @returns {S3Policy}
     */

    expire: function (deadline) {
      check(deadline, Date);

      policy.expiration = deadline.toISOString();

      return self;
    },


    /** Adds a constraint in which a property must equal a value.
     *
     * @param {String} property
     * @param {String} value
     *
     * @returns {S3Policy}
     */

    match: function (property, value) {
      var constraint = {};

      constraint[property] = value;

      policy.conditions.push(constraint);

      return self;
    },

    /** Set expiration time to a future value (relative from now)
     *
     * Subsequent calls override previous expiration values.
     *
     * @param {Number} seconds - Number of seconds in the future.
     *
     * @return {S3Policy}
     */

    expireIn: function (seconds) {
      return self.expire(new Date(Date.now() + seconds * 1000));
    },

    /** Adds a starts-width with constraint.
     *
     * @param {string} field - Name of the field without the preceding '$'
     * @param {string} constraint - Value that the field must start with
     * @returns {S3Policy}
     */

    startsWith: function (field, constraint) {
      policy.conditions.push(["starts-with", "$" + field, constraint]);
      return self;
    },

    /** Adds a redirection constraint
     *
     * @param redirect {string} URL
     * @returns {S3Policy}
     */

    redirect: function (redirect) {
      policy.conditions.push({success_action_redirect: redirect});
      return self;
    },

    /** Adds a file-size constraint
     *
     * @param lower {Number} Minimum file-size
     * @param upper {Number} Maximum file-size
     * @returns {S3Policy}
     */

    size: function (lower, upper) {
      policy.conditions.push(["content-length-range", lower, upper]);
      return self;
    },


    /** Encodes the policy to base64 and signs it with the AWS secret key.
     *
     * @param {string} secretKey
     * @returns {{policy: string, signature: string}}
     */
    getCredentials: function (secretKey) {
      check(secretKey, String);
      check(self.expiration, Date);

      // stringify and encode the policy
      var stringPolicy = JSON.stringify(policy),
          base64Policy = Buffer(stringPolicy, "utf-8").toString("base64");

      // sign the base64 encoded policy
      var signature = Npm.require("crypto").createHmac("sha1", secretKey)
        .update(new Buffer(base64Policy, "utf-8"))
        .digest("base64");

      // build the results object
      return {
        policy: base64Policy,
        signature: signature
      };
    },

    /** Signs a set of parameters.
     *
     * @param {Object} parameters
     * @param {String} secretKey
     * @returns {S3Policy}
     */

    sign: function (parameters, secretKey) {
      _.each(parameters, function (value, name) {
        self.match(name, value);
      });

      _.extend(parameters, self.getCredentials(secretKey));

      return self;
    }
  });
};
