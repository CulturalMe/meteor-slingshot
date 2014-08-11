
/* global FileUpload: true, S3Policy: false */

FileUpload = function () {};

var schemes = {};

FileUpload.addScheme = function (name, options) {
    if (_.has(schemes, name))
        throw new Error("Scheme '" + name + "' already exists");

    check(options.authorize, Function);
    check(options.maxSize, Number);

    if (options.timeout)
        check(options.timeout, Number);

    if (!options.allowedFileTypes)
        throw new Error("Missing specification for fileType in scheme " + name);

    if (options.uploaded)
        check(options.uploaded, Function);

    schemes[name] = options;
};

function getSettings() {
    return keenSettings.packages["edgee-file-upload"];
}

/**
 *
 * @param allowed {RegExp|Array|String}
 * @param actual {String}
 * @returns {boolean}
 */

function verifyFileType(allowed, actual) {
    check(actual, String);
    return allowed instanceof RegExp && allowed.test(actual) ||
        _.isArray(allowed) && allowed.indexOf(actual) >= 0 ||
        allowed === actual;
}


Meteor.methods({
    "edgee-file-upload": function (request) {
        check(request, Object);
        check(request.scheme, String);
        check(request.file, Object);
        check(request.file.type, String);
        check(request.file.name, String);
        check(request.file.size, Number);

        var bucket = getSettings() && getSettings().s3Bucket;

        if (!bucket)
            throw new Meteor.Error(300, "No bucket for file uploads set");

        if (request.meta)
            check(request.meta, Object);

        var scheme = schemes[request.scheme];

        if (!scheme)
            throw new Meteor.Error(404, "Scheme '" + request.scheme +
                "' does not exist");

        if (request.file.size > scheme.maxSize)
            throw new Meteor.Error(403, "File is too large");

        if (!verifyFileType(scheme.allowedFileTypes, request.file.type))
            throw new Meteor.Error(403, "File type is not allowed");


        var target = scheme.authorize.call(this, request);

        if (!target)
            throw new Meteor.Error(404, "Upload denied");

        _.defaults(target, {
            "Content-Type": request.file.type
        });

        check(target.key, String);

        var policy = new S3Policy(bucket, scheme.acl || "private");

        request.createdAt = new Date();
        request.key =  target.key;

        request.connetion_id = this.connection.id;

        if (scheme.timeout)
            policy.expireIn(scheme.timeout);

        policy.sign(target);

        return {
            target: target,

            postUrl: "https://" + bucket + ".s3.amazonaws.com/"
        };
    }

});