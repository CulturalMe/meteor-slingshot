/**
 * @fileOverview Notify devs when they attempt to use an outdated API
 */


function usePackage(package) {
  console.error("You must enable %s: meteor add %s", package, package);
}

Object.defineProperties(Slingshot, {

  S3Storage: {
    get: function () {
      usePackage("edgee:slingshot-s3");
    },

    configurable: true
  },

  GoogleCloud: {
    get: function () {
      usePackage("edgee:slingshot-google-cloud");
    },

    configurable: true
  },

  RackspaceFiles: {
    get: function () {
      usePackage("edgee:slingshot-rackspace");
    },

    configurable: true
  }
});
