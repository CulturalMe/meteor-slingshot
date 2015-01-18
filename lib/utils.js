var crypto = Npm.require("crypto");

/* global rsaSha256: true */
rsaSha256 = function (data, key, encoding) {
  return crypto
    .createSign('RSA-SHA256')
    .update(data)
    .sign(key, encoding || "base64");
};

/* global hmac256: true */
hmac256 = function (key, data, encoding) {
  return crypto
    .createHmac("sha256", key)
    .update(new Buffer(data, "utf-8"))
    .digest(encoding);
};
