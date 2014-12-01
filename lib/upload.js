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
      status = new ReactiveVar("idle"),
      dataUri = new ReactiveVar();

  function buildFormData() {
    var formData = new window.FormData();

    _.each(self.instructions.postData, function (field) {
      formData.append(field.name, field.value);
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
      if(window.chrome && window.navigator.vendor === "Google Inc.") {
        check(file, window.File);
      } else {
        // not Google chrome
        if (! (file instanceof window.File))
          throw new Error("Not a file");
      }

      self.file = file;

      self.request(function (error, instructions) {
        if (error) {
          return callback(error);
        }

        self.instructions = instructions;

        self.transfer(callback);
      });

      return self;
    },

    /**
     * @param {Function} [callback]
     * @returns {Slingshot.Upload}
     */

    request: function (callback) {

      if (!self.file) {
        callback(new Error("No file to request upload for"));
      }

      status.set("authorizing");

      Meteor.call("slingshot/uploadRequest", directive,
        _.pick(self.file, "name", "size", "type"), metaData, function (error,
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

      function getError() {
        return new Meteor.Error(xhr.statusText + " - " + xhr.status,
            "Failed to upload file to cloud storage");
      }

      xhr.addEventListener("load", function () {

        if (xhr.status < 400) {
          status.set("done");
          loaded.set(total.get());
          callback(null, self.instructions.download);
        }
        else {
          status.set("failed");
          callback(getError());
        }
      });

      xhr.addEventListener("error", function () {
        status.set("failed");
        callback(getError());
      });

      xhr.addEventListener("abort", function () {
        status.set("aborted");
        callback(new Meteor.Error("Aborted",
          "The upload has been aborted by the user"));
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
        dataUri.set();
        return self.instructions.download;
      }

      if (status !== "failed" && status !== "aborted" && self.file) {
        var URL = (window.URL || window.webkitURL)

        if (URL)
          return URL.createObjectURL(self.file);

        if (Tracker.active && window.FileReader) {
          var url = dataUri.get();

          if (url)
            return url;

          var reader = new window.FileReader();

          reader.onloadend = function () {
            dataUri.set(reader.result);
          };

          reader.readAsDataURL(self.file);
        }
      }
    }
  });
};
