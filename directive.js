/**
 * @module meteor-slingshot
 */

Slingshot = {};


/**
 * @callback Directive~authorize
 *
 * The Directive is passed on as the context of the authorize function.
 *
 * @throws Meteor.Error
 *
 * @param {{size: Number, type: String, name: String}} file - File to be
 * uploaded
 * @param {Object} [meta] - Meta information provided by the client.
 *
 * @returns Boolean Return true to authorize the requested upload.
 */

/**
 * @typedef {Object} Directive
 *
 * @property {Number} maxSize - Maximum size in bytes
 * @property {(string, string[], RegExp, null)} allowedFileTypes - MIME types
 * that can be uploaded. If null is passed, all file types will be allowed.
 *
 * @property {Directive~authorize} authorize - Function to determine whether a
 * file-upload is authorized or not.
 */

/**
 * @typedef {Object} FileInfo
 *
 * @property {String} name
 * @property {Number} size - File-size in bytes.
 * @property {String} type - mime type.
 * @property {Array.<String>} order - Order of keys in which form data should
 * appear
 */

/**
 * @typedef {Object} UploadInstructions
 *
 * @property {String} upload - POST URL
 * @property {String} download - Download URL
 * @property {Object} payload - Data to be transferred to storage service along
 * with file.
 *
 */

/**
 * List of installed directives by name.
 *
 * @type {Object.<string, Directive>}
 * @private
 */

Slingshot._directives = {};

/**
 * Creates file upload directive that defines a set of rule by which a file may
 * be uploaded.
 *
 * @param {string} name - A unique identifier of the directive.
 * @param {Object} service - A storage service to use.
 * @param {Directive} options
 * @returns {Slingshot.Directive}
 */

Slingshot.createDirective = function (name, service, options) {
  if (_.has(Slingshot._directives, name))
    throw new Error("Directive '" + name + "' already exists");

  return (Slingshot._directives[name] =
    new Slingshot.Directive(service, options));
};

/**
 * @param {string} name - The unique identifier of the directive to be
 * retrieved.
 * @returns {Slingshot.Directive}
 */

Slingshot.getDirective = function (name) {
  return this._directives[name];
};


var matchAllowedFileTypes = Match.OneOf(String, [String], RegExp, null);

/**
 * @param {Object} service
 * @param {Directive} directive
 * @constructor
 */

Slingshot.Directive = function (service, directive) {
  check(this, Slingshot.Directive);

  //service does not have to be a plain-object, so checking fields individually
  check(service.directiveMatch, Object);
  check(service.upload, Function);
  check(service.maxSize, Match.Optional(Number));
  check(service.allowedFileTypes, Match.Optional(matchAllowedFileTypes));

  check(directive, _.defaults({
    authorize: Function,
    maxSize: Number,
    allowedFileTypes: matchAllowedFileTypes
  }, service.directiveMatch));

  /**
   * @method storageService
   * @returns {Object}
   */

  this.storageService = function () {
    return service;
  };

  /**
   * @private
   * @property {Directive} _directive
   */

  this._directive = directive;
};

_.extend(Slingshot.Directive.prototype, {

  /**
   *
   * @method requestAuthorization
   *
   * @throws Meteor.Error
   *
   * @param {FileInfo} file
   * @param {Object} [meta]
   *
   * @returns {Boolean}
   */

  requestAuthorization: function (method, file, meta) {
    return this.checkFileSize(file.size) && this.checkFileType(file.type) &&
      this._directive.authorize.call(method, file, meta);
  },

  /**
   * @throws Meteor.Error
   *
   * @param {Number} size - Size of file in bytes.
   * @returns {boolean}
   */

  checkFileSize: function (size) {
    var maxSize = Math.min(this._directive.maxSize,
      this.storageService().maxSize || Infinity);

    if (maxSize && size > maxSize)
      throw new Meteor.Error("Upload denied", "File exceeds allowed size of " +
      formatBytes(maxSize));

    return true;
  },

  /**
   *
   * @throws Meteor.Error
   *
   * @param {String} type - Mime type
   * @returns {boolean}
   */

  checkFileType: function (type) {
    var allowed = this._directive.allowedFileTypes;

    if (allowed instanceof RegExp) {

      if (!allowed.test(type))
        throw new Meteor.Error("Upload denied",
          type + " is not an allowed file type");

      return true;
    }

    if (_.isArray(allowed)) {
      if (allowed.indexOf(type) < 0) {
        throw new Meteor.Error("Upload denied",
          type + " is not one of the followed allowed file types: " +
          allowed.join(", "));
      }

      return true;
    }

    if (allowed !== type) {
      throw new Meteor.Error("Upload denied", "Only file of type " + allowed +
        " can be uploaded");
    }

    return true;
  },

  /**
   *
   * @param {FileInfo} file
   * @param {Object} [meta]
   *
   * @returns UploadInstructions
   */

  getInstructions: function (method, file, meta) {
    return this.storageService().upload(method, this._directive, file, meta);
  }
});

Meteor.methods({
  /**
   * Requests to perform a file upload.
   *
   * @param {String} directiveName
   * @param {FileInfo} file
   * @param {Object} [meta]
   *
   * @returns {UploadInstructions}
   */

  "slingshot/uploadRequest": function (directiveName, file, meta) {
    check(directiveName, String);
    check(file, {
      type: String,
      name: String,
      size: Number
    });
    check(meta, Match.Optional(Object));

    var directive = Slingshot.getDirective(directiveName);

    if (!directive) {
      throw new Meteor.Error("Invalid directive",
        "The directive " + directiveName + " does not seem to exist");
    }

    if (!directive.requestAuthorization(this, file, meta)) {
      throw new Meteor.Error("Unauthorized", "You are not allowed to " +
        "upload this file");
    }

    return directive.getInstructions(this, file, meta);
  }
});


/** Human readable data-size in bytes.
 *
 * @param size {Number}
 * @returns {string}
 */

function formatBytes(size) {
  var units = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
      unit = units.shift();

  while (size >= 0x400 && units.length) {
    size /= 0x400;
    unit = units.shift();
  }

  return (Math.round(size * 100) / 100) + " " + unit;
}
