Package.describe({
  summary: "Directly post files to Google Cloud Storage using edgee:slingshot",
  version: "0.8.0",
  git: "https://github.com/CulturalMe/meteor-slingshot" +
    "/services/edgee:slingshot-google-cloud"
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.0');

  api.use([
    "underscore",
    "check",
    "edgee:slingshot@0.8.0",
    "edgee:slingshot-s3@0.8.0" // Google Cloud Storage is very similar to S3
  ]);

  api.addFiles("google-cloud.js", "server");

  api.imply("edgee:slingshot");
});
