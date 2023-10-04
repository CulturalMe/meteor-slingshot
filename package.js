Package.describe({
  name: "edgee:slingshot",
  summary: "Directly post files to cloud storage services, such as AWS-S3.",
  version: "0.7.2",
  git: "https://github.com/CulturalMe/meteor-slingshot"
});

Package.onUse(function (api) {
  api.versionsFrom('2.13.3')

  api.use(["underscore", "check"]);
  api.use(["tracker", "reactive-var"], "client");

  api.addFiles([
    "lib/restrictions.js",
    "lib/validators.js"
  ]);

  api.addFiles("lib/upload.js", "client");

  api.addFiles([
    "lib/directive.js",
    "lib/storage-policy.js",
    "services/aws-s3.js",
    "services/google-cloud.js",
    "services/rackspace.js"
  ], "server");

  api.export("Slingshot");
});

Package.onTest(function (api) {
  api.use(["tinytest", "underscore", "edgee:slingshot"]);
  api.addFiles("test/aws-s3.js", "server");
});
