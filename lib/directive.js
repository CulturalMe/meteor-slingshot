/**
 * @callback Directive~authorize
 *
 * The meteor method context is passed on to this function, including
 * this.userId
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
 * @property {(string, Array.<String>, RegExp, null)} allowedFileTypes - MIME
 * types that can be uploaded. If null is passed, then all file types are
 * allowed.
 *
 * @property {Directive~authorize} authorize - Function to determine whether a
 * file-upload is authorized or not.
 *
 * @property {String} [cacheControl] - rfc2616 Cache-Control directive (if
 * applicable to the selected storage service)
 *
 * @property {String} [contentDisposition] - rfc2616 Content-Disposition
 * directive. Defaults to "inline; <uploaded file name>"
 *
 * @property {String}
 */

/**
 * @typedef {Object} FileInfo
 *
 * @property {String} [name] - Given name to the file.
 * @property {Number} size - File-size in bytes.
 * @property {String} [type] - mime type.
 *
 */

/**
 * @typedef {Object} UploadInstructions
 *
 * @property {String} upload - POST URL
 * @property {String} download - Download URL
 * @property {Array.<{name: String, value: Object}>} postData - POST data to be
 * transferred to storage service along with credentials.
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

  var restrictions = Slingshot.getRestrictions(name);
  _.defaults(options, restrictions);

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

  _.defaults(directive, service.directiveDefault);

  check(directive, _.extend({
    authorize: Function,
    maxSize: Match.Where(function (size) {
      check(size, Match.OneOf(Number, null));

      return !size || size > 0 && size <= (service.maxSize || Infinity);
    }),
    allowedFileTypes: matchAllowedFileTypes,
    cdn: Match.Optional(String)
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
   * @param {{userId: String}} method
   * @param {FileInfo} file
   * @param {Object} [meta]
   *
   * @returns UploadInstructions
   */

  getInstructions: function (method, file, meta) {
    var instructions = this.storageService().upload(method, this._directive,
      file, meta);

    check(instructions, {
      upload: String,
      download: String,
      postData: [{
        name: String,
        value: Match.OneOf(String, Number, null)
      }],
      headers: Match.Optional(Object)
    });

    return instructions;
  },

 /**
  *
  * @method requestAuthorization
  *
  * @throws Meteor.Error
  *
  * @param {Object} context
  * @param {FileInfo} file
  * @param {Object} [meta]
  *
  * @returns {Boolean}
  */

  requestAuthorization: function (context, file, meta) {
    var validators = Slingshot.Validators,
        restrictions = _.pick(this._directive,
          ['authorize', 'maxSize', 'allowedFileTypes']
        );

    return validators.checkAll(context, file, meta, restrictions);
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
      type: Match.Optional(Match.Where(function (type) {
        check(type, String);
        return !type || /^[^\/]+\/[^\/]+$/.test(type);
      })),
      name: Match.Optional(String),
      size: Match.Where(function (size) {
        check(size, Number);
        return size >= 0;
      })
    });

    if (!file.type)
      delete file.type;

    check(meta, Match.Optional(Match.OneOf(Object, null)));

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

function quoteString(string, quotes) {
  return quotes + string.replace(quotes, '\\' + quotes) + quotes;
}
