/* global oauth: true */


oauth = {

  Jwt: function (claim, scope) {
    _.defaults(claim, {
      aud: "https://www.googleapis.com/oauth2/v3/token"
    });

    check(claim, {
      "iss": String,
      "aud": String,
      "sub": Match.Optional(String)
    });

    check(scope, [String]);

    claim.scope = scope.join(" ");

    _.extend(this, {
      _claim: claim,
      _header: this.encode({
        "alg": "RS256",
        "typ": "JWT"
      })
    });
  },

  TokenGenerator: function (jwt, key) {
    check(jwt, oauth.Jwt);
    check(key, String);

    this.endpoint = "https://www.googleapis.com/oauth2/v3/token";
    this.jwt = jwt;
    this.key = key;
    this.grantType = "urn:ietf:params:oauth:grant-type:jwt-bearer";
  }
};

_.extend(oauth.Jwt.prototype, {

  encode: function (object) {
    return new Buffer(JSON.stringify(object)).toString("base64");
  },

  sign: rsaSha256,

  makeClaim: function (iat, exp) {
    return this.encode(_.extend({
      exp: Math.round(exp.getTime() / 1000),
      iat: Math.round(iat.getTime() / 1000)
    }, this._claim));
  },

  compile: function (key, iat, exp) {
    var jwt = this._header + "." + this.makeClaim(iat, exp);
    return jwt + "." + this.sign(jwt, key);
  }
});

_.extend(oauth.TokenGenerator.prototype, {

  timeout: function () {
    if (!this._expires)
      return 0;

    return Math.max(this._expires.getTime() - Date.now(), 0);
  },

  getToken: Meteor.wrapAsync(function (callback) {
    if (!this._token || this.timeout() < 60000)
      this.requestNewToken(callback);
    else
      callback(null, this._token);
  }),

  requestNewToken: Meteor.wrapAsync(function (callback) {
    var self = this,
        querystring = Npm.require("querystring"),
        iat = new Date(),
        exp = new Date(iat.getTime() + 3600 * 1000);

    delete this._token;
    delete this._expires;

    HTTP.post(this.endpoint, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },

      content: querystring.stringify({
        grant_type: this.grantType,
        assertion: this.jwt.compile(this.key, iat, exp)
      })
    }, function (error, response) {
      if (!error && response) {
        self._expires = new Date(iat.getTime() +
          response.data.expires_in * 1000);
        self._token = response.data.access_token;
      }

      callback(error, self._token);
    });
  })

});
