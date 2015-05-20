Package.describe({
  name: "edgee:slingshot",
  summary: "Directly post files to cloud storage services, such as AWS-S3.",
  version: "0.8.0",
  git: "https://github.com/CulturalMe/meteor-slingshot"
});

Package.on_use(function (api) {
  api.versionsFrom('METEOR@1.0');

  api.use(["underscore", "check"]);
  api.use(["tracker", "reactive-var"], "client");

  api.addFiles([
    "lib/restrictions.js",
    "lib/validators.js"
  ]);

  api.addFiles("lib/upload.js", "client");

  api.addFiles(["lib/directive.js", "lib/legacy.js"], "server");

  api.export("Slingshot");
});
