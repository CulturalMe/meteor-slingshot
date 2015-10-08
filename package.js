Package.describe({
  name: "edgee:slingshot",
  summary: "Directly post files to cloud storage services, such as AWS-S3.",
  version: "0.7.1-test",
  git: "https://github.com/CulturalMe/meteor-slingshot"
});

Package.on_use(function (api) {
  api.versionsFrom('METEOR@1.0');

  api.use(["underscore", "check"]);
  api.use(["tracker", "reactive-var"], "client");

  api.add_files([
    "lib/restrictions.js",
    "lib/validators.js"
  ]);

  api.add_files("lib/upload.js", "client");

  api.add_files([
    "lib/directive.js",
    "lib/storage-policy.js",
    "services/aws-s3.js",
    "services/google-cloud.js",
    "services/rackspace.js"
  ], "server");

  api.export("Slingshot");
});

Package.on_test(function (api) {
  api.use(["tinytest", "underscore", "edgee:slingshot"]);
  api.add_files("test/aws-s3.js", "server");
});
