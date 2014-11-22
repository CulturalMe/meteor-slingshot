Package.describe({
  name: "edgee:slingshot",
  summary: "Directly post files to cloud storage services, such as AWS-S3.",
  version: "0.2.0"
});

Package.on_use(function (api) {
  api.use(["mongo-livedata", "edgee-aws"], "server");
  api.use(["underscore", "check"]);
  api.use("tracker", "client");

  api.add_files("upload.js", "client");
  api.add_files(["directive.js","aws-s3.js"], "server");

  api.export("Slingshot");
});
