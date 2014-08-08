/**
 * @fileOverview Defines client side API in which files can be uploaded.
 */

/*global FileUpload: true */


/** Direct file upload from client to AWS S3
 *
 * @param file {File} The file to be uploaded. (http://mzl.la/1nFeQFb)
 * @param scheme {string} Name of the upload scheme
 * @param [metaData] {Object} Data to help handling the file on the server side
 * @constructor
 */

FileUpload = function (file, scheme, metaData) {
    var started = false,
        done = function () {},
        formData = null,
        xhr = window.getXMLHTTPObject(),
        progress = 0,
        dep = new Deps.Dependency();


    xhr.upload.addEventListener("progress", function (event) {
        if (event.lengthComputable) {
            dep.changed();
            progress = event.loaded / event.total;
        }
    }, false);


    Meteor.call("edgee-file-upload-start", {
        scheme: scheme,
        file: _.pick(file, "name", "size", "type"),
        meta: metaData
    }, function (error, response) {
        if (error)
            throw error;

        formData = new FormData();
        formData.append("file", file);

        _.each(response.target, function (value, key) {
            formData.append(key, value);
        });

        xhr.addEventListener("load", function (event) {
            Meteor.call("edgee-file-upload-end", response._id,
                event.target.responseText, function (error) {
                    if (error)
                        done(error);

                    dep.changed();
                    progress = 1;

                    done(null, response.target.key);
                });
        });

        xhr.addEventListener("error", function (event) {
            dep.changed();
            progress = 0;

            done(new Error("Upload failed:" + event));
        });

        xhr.addEventListener("abort", function () {
            done(new Error("The upload has been cancelled"));
        });

        xhr.open("POST", response.postUrl, true);

        if (started) {
            upload();
        }
    });


    function upload() {
        if (!formData)
            throw new Error("Upload has not been authorized");

        xhr.send(formData);
    }

    _.extend(this, {

        /** Start uploading the file.
         *
         * @param callback {Function} Gets called when the file was uploaded or
         * on error.
         */

        start: function (callback) {
            if (started)
                throw new Error("Upload has already started");

            started = true;

            done = callback;

            if (formData)
                upload();
        },

        /** Reactive function that returns the current progress value.
         *
         * @returns {number} A value between 0 and 1.
         */

        progress: function () {
            dep.depend();
            return progress;
        }
    });
};