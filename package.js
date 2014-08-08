/**
 * @fileOverview Describes the edgee-file-upload package.
 */

Package.describe({
    summary: "Upload files to S3"
});

Package.on_use(function (api) {
    var both = ["client", "server"];

    api.use(["keen-settings", "mongo-livedata", "edgee-aws"], "server");

    api.use("underscore", both);

    api.use("deps", "client");

    api.add_files("client.js", "client");
    api.add_files("server.js", "server");

    api.export("FileUpload", both);
});