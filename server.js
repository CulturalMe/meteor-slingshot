
/* global FileUpload: true, FileUploads: true, S3Policy: false */

FileUploads = new Meteor.Collection("edgee-file-uploads", {
    _autopublish: false
});

if (Package.insecure)
    FileUploads.deny({
        insert: function () {
            return true;
        },

        update: function () {
            return true;
        },

        remove: function () {
            return true;
        }
    });

FileUpload = function () {};

var schemes = {};

FileUpload.addScheme = function (name, options) {
    if (_.has(schemes, name))
        throw new Error("Scheme '" + name + "' already exists");

    check(options.authorize, Function);

    if (options.uploaded)
        check(options.uploaded, Function);

    schemes[name] = options;
};

function getSettings() {
    return keenSettings.package["edgee-file-upload"];
}


Meteor.methods({
    "edgee-file-upload-start": function (params) {
        check(params, Object);
        check(params.scheme, String);
        check(params.file, Object);
        check(params.file.type, String);
        check(params.file.name, String);
        check(params.file.size, Number);

        var bucket = getSettings() && getSettings().s3Bucket;

        if (!bucket)
            throw new Meteor.Error("No bucket for file uploads set");

        if (params.meta)
            check(params.meta, Object);

        var scheme = schemes[params.scheme];

        if (!scheme)
            throw new Meteor.Error("Scheme '" + params.scheme +
                "' does not exist");

        var target = scheme.authorize.call(this, params);

        if (!target)
            throw new Meteor.Error("Upload denied");

        check(target.key, String);

        var policy = new S3Policy(bucket, scheme.acl || "private");

        if (scheme.timeout)
            policy.expireIn(scheme.timeout);

        policy.sign(target);

        params.createdAt = new Date();
        params.key =  target.key;

        params.connetion_id = this.connection.id;

        return {
            id: FileUpload.insert(params, function (error) {
                if (error)
                    throw error;
            }),

            target: target,

            postUrl: "https://" + bucket + ".s3.amazonaws.com"
        };
    },

    "edgee-file-upload-end": function (id) {
        var upload = FileUpload.findOne(id);

        if (!upload || upload.connection_id !== this.connection.id) {
            throw new Meteor.Error(404, "Upload denied");
        }

        if (upload.done)
            return;

        var scheme = schemes[upload.scheme];

        if (scheme.uploaded)
            scheme.uploaded.call(this, upload);

        FileUpload.update(id, {$set: {done: true}});
    }
});