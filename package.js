Package.describe({
  name: "edgee:slingshot",
  summary: "Directly post files to cloud storage services, such as AWS-S3.",
  version: "0.2.0"
});

Package.on_use(function (api) {
  api.use(["underscore", "check"]);
  api.use("tracker", "client");

  api.add_files("lib/upload.js", "client");
  api.add_files([
    "lib/directive.js",
    "services/aws-s3.js",
    "services/google-cloud.js"
  ], "server");

  api.export("Slingshot");
});
