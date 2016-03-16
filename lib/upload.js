/**
 * @fileOverview Defines client side API in which files can be uploaded.
 */

/**
 *
 * @param {string} directive - Name of server-directive to use.
 * @param {object} [metaData] - Data to be sent to directive.
 * @constructor
 */

Slingshot.Upload = function (directive, metaData) {

  if (!window.File || !window.FormData )  {
    if(!cordova || !cordova.file || !FileTransfer)
      throw new Error("Browser does not support HTML5 uploads and cordova file transfer is not available");
  }

  var self = this,
      loaded = new ReactiveVar(),
      total = new ReactiveVar(),
      status = new ReactiveVar("idle"),
      dataUri,
      preloaded;

  function buildFormData() {
    var formData = new window.FormData();

    _.each(self.instructions.postData, function (field) {
      formData.append(field.name, field.value);
    });

    formData.append("file", self.file);

    return formData;
  }

  function cordova_transfer(callback){
    status.set("transferring");
    loaded.set(0);

    var ft = new FileTransfer();

    ft.onprogress = function(progressEvent){
      if(progressEvent.lengthComputable){
        loaded.set(progressEvent.loaded);
        total.set(progressEvent.total);
      }
    };

    var options = new FileUploadOptions();
    options.headers = {};
    _.each(self.instructions.headers, function (value, key) {
      options.headers[key] = value;
    });
    options.headers['Content-Length'] = self.file.size;


    options.params = {};
    _.each(self.instructions.postData, function (value) {
      options.params[value.name] = value.value;
    });

    var fileUrl = self.file.nativeURL;
    options.fileKey = "file";
    options.fileName = self.file.name;
    options.mimeType = self.file.type;
    //options.chunkMode = false;
    options.httpMethod = 'post';


    ft.upload(fileUrl,encodeURI(self.instructions.upload),function(result){
      status.set("done");
      loaded.set(total.get());
      callback(null, self.instructions.download);

    },function(err){
      status.set("failed");
      callback(new Meteor.Error(err.http_status,"Failed to upload file to cloud storage",err.exception));
    },options);

    self.xhr = ft;

    return self;
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
    * @returns {null|Error} Returns null on success, Error on failure.
    */

    validate: function(file) {
      var context = {
        userId: Meteor.userId && Meteor.userId()
      };
      try {
        var validators = Slingshot.Validators,
            restrictions = Slingshot.getRestrictions(directive);

        validators.checkAll(context, file, metaData, restrictions) && null;
      } catch(error) {
        return error;
      }
    },

    /**
     * @param {(File|Blob)} file
     * @param {Function} [callback]
     * @returns {Slingshot.Upload}
     */

    send: function (file, callback) {
      if (! (file instanceof window.File) && ! (file instanceof window.Blob) && !( typeof file==='string' && /^file:\/\/.*$/i.test(file)) )
        throw new Error("Not a file");

      function _send(){
        self.request(function (error, instructions) {
          if (error) {
            return callback(error);
          }

          self.instructions = instructions;

          self.transfer(callback);
        });
      }

      if(/^file:\/\/.*$/i.test(file)) {
        window.resolveLocalFileSystemURL(file, function (fileEntry) {
          fileEntry.file(function (f) {
            self.file = f;
            self.file.nativeURL = fileEntry.nativeURL;
            _send();
          })
        })
      }else{
        self.file = file;
        _send();
      }


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

      var file = _.pick(self.file, "name", "size", "type");

      status.set("authorizing");

      var error = this.validate(file);
      if (error) {
        status.set("failed");
        callback(error);
        return self;
      }

      Meteor.call("slingshot/uploadRequest", directive,
        file, metaData, function (error, instructions) {
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
      if(self.file.hasOwnProperty('nativeURL'))//cordova File
      {
        return cordova_transfer(callback);
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

      _.each(self.instructions.headers, function (value, key) {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(buildFormData());
      self.xhr = xhr;

      return self;
    },

    /**
     * @returns {boolean}
     */

    isImage: function () {
      self.status(); //React to status change.
      return Boolean(self.file && self.file.type.split("/")[0] === "image");
    },

    /**
     * Latency compensated url of the file to be uploaded.
     *
     * @param {boolean} preload
     *
     * @returns {string}
     */

    url: function (preload) {
      if (!dataUri) {
        var localUrl = new ReactiveVar(),
            URL = (window.URL || window.webkitURL);

        dataUri = new ReactiveVar();

        Tracker.nonreactive(function () {

          /*
           It is important that we generate the local url not more than once
           throughout the entire lifecycle of `self` to prevent flickering.
           */

          var previewRequirement = new Tracker.Dependency();

          Tracker.autorun(function (computation) {
            if (self.file) {
              if (URL) {
                localUrl.set(URL.createObjectURL(self.file));
                computation.stop();
              }
              else if (Tracker.active && window.FileReader) {
                readDataUrl(self.file, function (result) {
                  localUrl.set(result);
                  computation.stop();
                });
              }
            }
            else {
              previewRequirement.depend();
            }
          });

          Tracker.autorun(function (computation) {
            var status = self.status();

            if (self.instructions && status === "done") {
              computation.stop();
              dataUri.set(self.instructions.download);
            }
            else if (status === "failed" || status === "aborted") {
              computation.stop();
            }
            else if (self.file && !dataUri.curValue) {
              previewRequirement.changed();
              dataUri.set(localUrl.get());
            }
          });
        });
      }

      if (preload) {

        if (self.file && !self.isImage())
          throw new Error("Cannot pre-load anything other than images");

        if (!preloaded) {
          Tracker.nonreactive(function () {
            preloaded = new ReactiveVar();

            Tracker.autorun(function (computation) {
              var url = dataUri.get();

              if (self.instructions) {
                preloadImage(url, function () {
                  computation.stop();
                  preloaded.set(url);
                });
              }
              else
                preloaded.set(url);
            });
          });
        }

        return preloaded.get();
      }
      else
        return dataUri.get();
    },

    /** Gets an upload parameter for the directive.
     *
     * @param {String} name
     * @returns {String|Number|Undefined}
     */

    param: function (name) {
      self.status(); //React to status changes.

      var data = self.instructions && self.instructions.postData,
          field = data && _.findWhere(data, {name: name});

      return field && field.value;
    }

  });
};

/**
 *
 * @param {String} image - URL of image to preload.
 * @param {Function} callback
 */

function preloadImage(image, callback) {
  var preloader = new window.Image();

  preloader.onload = callback;

  preloader.src = image;
}

function readDataUrl(file, callback) {
  var reader = new window.FileReader();

  reader.onloadend = function () {
    callback(reader.result);
  };

  reader.readAsDataURL(file);
}
