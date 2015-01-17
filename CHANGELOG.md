Slingshot Changelog
===================

## Version 0.3.0

### New Features and Enhancements

 * Added file-restriction sharing with client (#32)
 * Use blob object url instead of base64 encoded files for latency compensation (#6)
 * Added .param() method to Slingshot.Upload (#11)
 * Added image pre-loading for smoother, flicker-less latency compensation (#4)
 * Added support for uploading Blob objects instead of Files. (#22) file.name is no longer a required property for uploads.
 * Removed code duplication in Gougle Cloud and AWS S3 service implementation (they have a lot in common)
 * Added the cdn directive parameter.
 * Removed domain directive parameter.
 * Added bucketUrl directive parameter to Google Cloud and AWS S3.

### Bug Fixes

 * Fixed uploads for undetectable mime-type (#34)

## Version 0.2.0

Fixes #3: Providing 0 or null for maxSize means that there will be no file size limit exposed.
