
/**
 * @constructor
 */

Slingshot.StoragePolicy = function () {

  /**
   * @type {{[expiration]: String, conditions: Array.<(Object|Array)>}}
   */

  var policy = {conditions: []};

  var self = this;

  _.extend(self, {

    /** Set policy expiration time (as an absolute value).
     *
     * Subsequent calls override previous expiration values.
     *
     * @param {Date} deadline
     *
     * @returns {Slingshot.StoragePolicy}
     */

    expire: function (deadline) {
      check(deadline, Date);

      policy.expiration = deadline.toISOString();

      return self;
    },


    /** Adds a constraint in which a property must equal a value.
     *
     * @param {(String|Object.<String, String>)} property
     * @param {String} [value]
     *
     * @returns {Slingshot.StoragePolicy}
     */

    match: function (property, value) {
      if (_.isObject(property)) {
        _.each(property, function (value, property) {
          self.match(property, value);
        });
      }
      else if (property && !_.isUndefined(value)) {
        var constraint = {};

        constraint[property] = value;

        policy.conditions.push(constraint);
      }

      return self;
    },

    /** Set expiration time to a future value (relative from now)
     *
     * Subsequent calls override previous expiration values.
     *
     * @param {Number} ms - Number of milliseconds in the future.
     *
     * @return {Slingshot.StoragePolicy}
     */

    expireIn: function (ms) {
      return self.expire(new Date(Date.now() + ms));
    },

    /** Adds a starts-with constraint.
     *
     * @param {string} field - Name of the field without the preceding '$'
     * @param {string} constraint - Value that the field must start with
     * @returns {Slingshot.StoragePolicy}
     */

    startsWith: function (field, constraint) {
      policy.conditions.push(["starts-with", "$" + field, constraint]);
      return self;
    },

    /** Adds a file-size constraint
     *
     * @param minimum {Number} Minimum file-size
     * @param maximum {Number} Maximum file-size
     * @returns {Slingshot.StoragePolicy}
     */

    contentLength: function (minimum, maximum) {
      policy.conditions.push(["content-length-range", minimum, maximum]);
      return self;
    },

    /**
     * @returns {string}
     */

    stringify: function (encoding) {
      /* global Buffer: false */
      return Buffer(JSON.stringify(policy), "utf-8")
        .toString(encoding || "base64");
    }
  });
};

