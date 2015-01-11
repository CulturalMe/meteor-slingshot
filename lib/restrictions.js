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
    allowedFileTypes: Match.Optional(matchAllowedFileTypes)
  });

  if (Meteor.isServer) {
    var directive = Slingshot.getDirective(name);
    if (directive) {
      _.extend(directive._directive, restrictions);
    }
  }

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
