Slingshot Changelog
===================

## Version 0.4.0

### New Features and Enhancements

 * Added region parameters to S3. The default is `us-east-1`. This fixes bucketUrl problems [#33](https://github.com/CulturalMe/meteor-slingshot/issues/33).
 * Upgrade to `AWS4-HMAC-256` for S3 policy signing to make slingshot compatible with new AWS datacenters, such as Frankfurt. [#33](https://github.com/CulturalMe/meteor-slingshot/issues/33)
 * Added Rackspace Cloud Files support [#17](https://github.com/CulturalMe/meteor-slingshot/issues/17).
 * Added dependency to the core HTTP package on the server side.
 * Added resumable upload support for Google Cloud Storage.
 * Upload instructions returned by upload services now must include an upload method (`PUT` or `POST`)

## Version 0.3.0

### New Features and Enhancements

 * Added file-restriction sharing with client ([#32](https://github.com/CulturalMe/meteor-slingshot/issues/32))
 * Use blob object url instead of base64 encoded files for latency compensation ([#6](https://github.com/CulturalMe/meteor-slingshot/issues/6))
 * Added .param() method to Slingshot.Upload ([#11](https://github.com/CulturalMe/meteor-slingshot/issues/6))
 * Added image pre-loading for smoother, flicker-less latency compensation ([#4](https://github.com/CulturalMe/meteor-slingshot/issues/4))
 * Added support for uploading Blob objects instead of Files. ([#22](https://github.com/CulturalMe/meteor-slingshot/issues/22)) file.name is no longer a required property for uploads.
 * Removed code duplication in Gougle Cloud and AWS S3 service implementation (they have a lot in common)
 * Added the cdn directive parameter.
 * Removed domain directive parameter.
 * Added bucketUrl directive parameter to Google Cloud and AWS S3.

### Bug Fixes

 * Fixed uploads for undetectable mime-type ([#34](https://github.com/CulturalMe/meteor-slingshot/issues))

## Version 0.2.0

Fixes [#3](https://github.com/CulturalMe/meteor-slingshot/issues/3): Providing 0 or null for maxSize means that there will be no file size limit exposed.
