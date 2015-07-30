Tinytest.add("Slingshot - Cloudinary - Signature", function (test) {
  //http://cloudinary.com/documentation/api_and_access_identifiers

  var secretKey = "b40675e575055c63b33d5862c56ea45c";
  var payload = {
    cloudName: 'demo',
    api_key: '797895983348998'
  };

  var signature = Slingshot.Cloudinary.signature(payload);

  test.equal(signature, "859c4ba24ec64ce671c9c2ee2950c742ec3d28f0");
});
