Package.describe({
  summary: "Directly post files to AWS-S3 using edgee:slingshot",
  version: "0.8.0",
  git: "https://github.com/CulturalMe/meteor-slingshot" +
    "/services/edgee:slingshot-s3"
});

Package.on_use(function (api) {
  api.versionsFrom('METEOR@1.0');

  api.use([
    "underscore",
    "check",
    "edgee:slingshot@0.8.0"
  ]);

  api.add_files([
    "storage-policy.js",
    "aws-s3.js"
  ], "server");

  api.imply("edgee:slingshot");
});

Package.on_test(function (api) {
  api.use(["tinytest", "underscore", "edgee:slingshot-s3"]);
  api.add_files("test/aws-s3.js", "server");
});
