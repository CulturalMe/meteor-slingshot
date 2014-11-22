/**
 * @fileOverview Defines client side API in which files can be uploaded.
 */

Slingshot = {};

/**
 *
 * @param {string} directive - Name of server-directive to use.
 * @param {object} [metaData] - Data to be sent to directive.
 * @constructor
 */

Slingshot.Upload = function (directive, metaData) {

  if (!window.File || !window.FormData) {
    throw new Error("Browser does not support HTML5 uploads");
  }

  var self = this,
      loaded = new ReactiveVar(),
      total = new ReactiveVar(),
      status = new ReactiveVar("idle");

  function buildFormData() {
    var formData = new window.FormData();

    _.each(self.instructions.dataOrder, function (field) {
      formData.append(field, self.instructions.payload[field]);
    });

    formData.append("file", self.file);

    return formData;
  }

  _.extend(self, {

    /**
     * @returns {string}
     */

    status: function () {
      return status.get();
    },

    /**
     * @returns {number}
     */

    progress: function () {
      return self.uploaded() / total.get();
    },

    /**
     * @returns {number}
     */

    uploaded: function () {
      return loaded.get();
    },

    /**
     * @param {File} file
     * @param {Function} [callback]
     * @returns {Slingshot.Upload}
     */

    send: function (file, callback) {
      check(file, window.File);

      self.file = file;

      self.request(file, function (error, instructions) {
        if (error) {
          return callback(error);
        }

        self.instructions = instructions;

        self.transfer(file, callback);
      });

      return self;
    },

    /**
     * @param {Function} [callback]
     * @returns {Slingshot.Upload}
     */

    request: function (callback) {
      status.set("authorizing");
      Meteor.call("slingshot/uploadRequest", directive, metaData,
        _.pick(self.file, "name", "size", "type"), function (error,
                                                             instructions) {
          status.set(error ? "failed" : "authorized");

          callback(error, instructions);
        });

      return self;
    },

    /**
     * @param {Function} [callback]
     *
     * @returns {Slingshot.Upload}
     */

    transfer: function (callback) {
      if (status.curValue !== "authorized") {
        throw new Error("Cannot transfer file at upload status: " +
          status.curValue);
      }

      status.set("transferring");
      loaded.set(0);

      var xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", function (event) {
        if (event.lengthComputable) {
          loaded.set(event.loaded);
          total.set(event.total);
        }
      }, false);

      xhr.addEventListener("load", function () {
        status.set("done");
        loaded.set(total.get());
        callback(null, self.instructions.download);
      });

      xhr.addEventListener("error", function () {
        status.set("failed");
        callback(new Error("Upload failed - see console logs"));
      });

      xhr.addEventListener("abort", function () {
        status.set("aborted");
        callback(new Error("The upload has been cancelled"));
      });

      xhr.open("POST", self.instructions.upload, true);
      xhr.send(buildFormData());

      return self;
    },

    /**
     * Latency compensated url of the file to be uploaded.
     *
     * @returns {string}
     */

    url: function () {
      var status = self.status();

      if (self.instructions && status === "done") {
        return self.instructions.download;
      }

      if (self.file && status !== "failed" && status !== "aborted" &&
        window.FileReader) {
          var reader = new window.FileReader();
          return reader.readAsDataURL(self.file);
      }
    }
  });
};
