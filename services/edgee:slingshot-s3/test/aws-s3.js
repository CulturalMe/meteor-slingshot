Tinytest.add("Slingshot - AWS S3 - Signature", function (test) {
  //http://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-post-example.html

  var AWSSecretAccessKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      policy = "eyAiZXhwaXJhdGlvbiI6ICIyMDEzLTA4LTA3VDEyOjAwOjAwLjAwMFoiLA0KI" +
        "CAiY29uZGl0aW9ucyI6IFsNCiAgICB7ImJ1Y2tldCI6ICJleGFtcGxlYnVja2V0In0sD" +
        "QogICAgWyJzdGFydHMtd2l0aCIsICIka2V5IiwgInVzZXIvdXNlcjEvIl0sDQogICAge" +
        "yJhY2wiOiAicHVibGljLXJlYWQifSwNCiAgICB7InN1Y2Nlc3NfYWN0aW9uX3JlZGlyZ" +
        "WN0IjogImh0dHA6Ly9leGFtcGxlYnVja2V0LnMzLmFtYXpvbmF3cy5jb20vc3VjY2Vzc" +
        "2Z1bF91cGxvYWQuaHRtbCJ9LA0KICAgIFsic3RhcnRzLXdpdGgiLCAiJENvbnRlbnQtV" +
        "HlwZSIsICJpbWFnZS8iXSwNCiAgICB7IngtYW16LW1ldGEtdXVpZCI6ICIxNDM2NTEyM" +
        "zY1MTI3NCJ9LA0KICAgIFsic3RhcnRzLXdpdGgiLCAiJHgtYW16LW1ldGEtdGFnIiwgI" +
        "iJdLA0KDQogICAgeyJ4LWFtei1jcmVkZW50aWFsIjogIkFLSUFJT1NGT0ROTjdFWEFNU" +
        "ExFLzIwMTMwODA2L3VzLWVhc3QtMS9zMy9hd3M0X3JlcXVlc3QifSwNCiAgICB7IngtY" +
        "W16LWFsZ29yaXRobSI6ICJBV1M0LUhNQUMtU0hBMjU2In0sDQogICAgeyJ4LWFtei1kY" +
        "XRlIjogIjIwMTMwODA2VDAwMDAwMFoiIH0NCiAgXQ0KfQ==";

  var signature = Slingshot.S3Storage.signAwsV4(policy, AWSSecretAccessKey,
    "20130806", "us-east-1", "s3");

  test.equal(signature, "21496b44de44ccb73d545f1a995c68214c9cb0d41c45a17a5dae" +
  "ec0b1a6db047");
});
