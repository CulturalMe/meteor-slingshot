Slingshot.RackspaceFiles = {

  directiveMatch: {
    RackspaceAccountId: String,
    RackspaceSecretKey: String,
    container: String,
    pathPrefix: Match.OneOf(String, Function),
    expire: Match.Where(function (expire) {
      check(expire, Number);

      return expire > 0;
    }),
    deleteAt: Match.Optional(Date),
    deleteAfter: Match.Optional(Number)
  },

  directiveDefault: {
    expire: 5 * 60 * 1000 //in 5 minutes
  },

  version: "v1",

  path: function (method, directive, file, meta) {
    var path = [
      this.version,
      directive.RackspaceAccountId,
      directive.container
    ];

    if ("pathPrefix" in directive) {
      path.push(_.isFunction(directive.pathPrefix) ?
        directive.pathPrefix.call(method, file, meta) : directive.pathPrefix);
    }

    return ("/" + path.join("/")).replace(/\/+/, "/");
  },

  host: "https://storage.clouddrive.com",

  maxSize: 0x140000000, //5GB

  upload: function (method, directive, file, meta) {
    var path = this.path(method, directive, file, meta),
        host = _.result(this, "host"),
        url = host + path,
        data = [
          {
            name: "redirect",
            value: ""
          },
          {
            name: "max_file_size",
            value: Math.min(file.size, directive.maxSize || this.maxSize)
          },
          {
            name: "max_file_count",
            value: 1
          },
          {
            name: "expires",
            value: Date.now() + directive.expire
          }
        ];

    data.push({
        name: "signature",
        value: this.sign(directive.RackspaceSecretKey, path, data)
    });

    if ("deleteAt" in directive)
      data.push({
        name: "x-delete-at",
        value: directive.deleteAt.getTime()
      });

    if ("deleteAfter" in directive)
      data.push({
        name: "x-delete-after",
        value: Math.round(directive.deleteAfter / 1000)
      });

    return {
      upload: url,
      download: url + "/" + file.name,
      postData: data
    };
  },

  sign: function (secretkey, path, data) {
    /* global Buffer: false */
    var policy = path + "\n" + _.pluck(data, "value").join("\n");

    return Npm.require("crypto")
      .createHmac("sha1", secretkey)
      .update(new Buffer(policy, "utf-8"))
      .digest("hex");
  }

};
