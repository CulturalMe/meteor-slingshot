Package.describe({
  summary: "Directly post files to Rackspace Cloud Files using edgee:slingshot",
  version: "0.8.0",
  git: "https://github.com/CulturalMe/meteor-slingshot" +
    "/services/edgee:slingshot-rackspace"
});

Package.on_use(function (api) {
  api.versionsFrom('METEOR@1.0');

  api.use([
    "underscore",
    "check",
    "edgee:slingshot@0.8.0"
  ]);

  api.add_files("rackspace.js", "server");

  api.imply("edgee:slingshot");
});
