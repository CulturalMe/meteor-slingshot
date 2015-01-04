Slingshot.Validators = {

 /**
  *
  * @method checkAll
  *
  * @throws Meteor.Error
  *
  * @param {Object} context
  * @param {FileInfo} file
  * @param {Object} [meta]
  * @param {Object} [restrictions]
  *
  * @returns {Boolean}
  */

  checkAll: function (context, file, meta, restrictions) {
    return this.checkFileSize(file.size, restrictions.maxSize) &&
      this.checkFileType(file.type, restrictions.allowedFileTypes) &&
      (typeof restrictions.authorize !== 'function' ||
        restrictions.authorize.call(context, file, meta));
  },

  /**
   * @throws Meteor.Error
   *
   * @param {Number} size - Size of file in bytes.
   * @param {Number} maxSize - Max size of file in bytes.
   * @returns {boolean}
   */

  checkFileSize: function (size, maxSize) {
    maxSize = Math.min(maxSize, Infinity);

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
   * @param {(RegExp|Array|String)} [allowed] - Allowed file type(s)
   * @returns {boolean}
   */

  checkFileType: function (type, allowed) {
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

    if (allowed && allowed !== type) {
      throw new Meteor.Error("Upload denied", "Only files of type " + allowed +
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
