/**
 * @module meteor-slingshot
 */

Slingshot = {};

/* global matchAllowedFileTypes: true */
matchAllowedFileTypes = Match.OneOf(String, [String], RegExp, null);

/**
 * List of configured restrictions by name.
 *
 * @type {Object.<String, Function>}
 * @private
 */

Slingshot._restrictions = {};

/**
 * Creates file upload restrictions for a specific directive.
 *
 * @param {string} name - A unique identifier of the directive.
 * @param {Object} restrictions - The file upload restrictions.
 * @returns {Object}
 */

Slingshot.fileRestrictions = function (name, restrictions) {
  check(restrictions, {
    authorize: Match.Optional(Function),
    maxSize: Match.Optional(Match.OneOf(Number, null)),
    allowedFileTypes: Match.Optional(matchAllowedFileTypes),
  });
  
  return (Slingshot._restrictions[name] = 
    _.extend(Slingshot._restrictions[name] || {}, restrictions));
};

/**
 * @param {string} name - The unique identifier of the directive to
 * retrieve the restrictions for.
 * @returns {Object}
 */

Slingshot.getRestrictions = function (name) {
  return this._restrictions[name] || {};
};

/* global mixins: true */
mixins = {
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
    var authorize = this.getRestriction("authorize");
    return this.checkFileSize(file.size) && this.checkFileType(file.type) &&
      (typeof authorize !== 'function' || authorize.call(method, file, meta));
  },

  /**
   * @throws Meteor.Error
   *
   * @param {Number} size - Size of file in bytes.
   * @returns {boolean}
   */

  checkFileSize: function (size) {
    var maxSize = Math.min(this.getRestriction("maxSize"), Infinity);

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
    var allowed = this.getRestriction("allowedFileTypes");

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
  }
};

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