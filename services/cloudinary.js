Slingshot.Cloudinary = {

  apiBaseUrl: 'https://api.cloudinary.com/v1_1/',

  directiveMatch: {
    CloudinaryApikey: String,
    CloudinaryApiSecret: String,
    CloudinaryApiBaseUrl: String,
    CloudinaryBaseUrl: String,
    CloudinaryCloudName: String,
    CloudinarySecureUrl: String
  },

  directiveDefault: _.chain(Meteor.settings)
    .pick('CloudinaryApiKey', 'CloudinaryApiSecret', 'CloudinaryCloudName')
    .extend({
      CloudinaryApiBaseUrl: Meteor.settings.CloudinaryApiBaseUrl || this.apiBaseUrl,
      CloudinaryBaseUrl: Meteor.settings.CloudinaryBaseUrl || 'http://res.cloudinary/' + Meteor.settings.CloudinaryCloudName,
      CloudinarySecureUrl: Meteor.settings.CloudinarySecureUrl || 'https://res.cloudinary/' + Meteor.settings.CloudinaryCloudName
    })
    .value(),

  upload: function (method, directive, file, meta) {
    var endpoint = directive.CloudinarySecureUrl + '/image/upload';
    var payload = _.extend(meta, {
      api_key: directive.CloudinaryApiKey,
      timestamp: Date.now(),
      file: file
    });
    var postData = _.extend(payload, {
      signature: directive.signature(payload, directive.CloudinarySecretKey)
    });

    return {
      upload: endpoint,
      download: directive.CloudinarySecureUrl + file.name,
      postData: postData
    }
  },

  /** Generate signature
  /*
  /* @param {Object} payload - The payload object to return signature
  /* @param {String} secretKey - The secret key
  /* @returns {String} - Signature
  **/

  signature: function(payload, secretKey) {
    var serializedPayload = Object.keys(payload).sort().map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k])
    }).join('&') + secretKey;
    return CryptoJS.SHA1(serializedPayload).toString();
  },

  maxSize: Math.pow(10,17)
}
