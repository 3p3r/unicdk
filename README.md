# unicdk

one cdk to rule them all! welcome to my late-stage addiction to cdk.  

## summary

Large scale cloud projects often have many moving components across technologies
across multiple clouds. Some parts might be in Terraform and on Azure, some part
might be in CloudFormation and on AWS, and some might be in Kubernetes on GCP.

`unicdk` brings `AWS CDK`, `CDK-TF`, and `CDK8s` together into one toolchain.

## install

`npm install unicdk`

## usage

```TS
// use this App class for all your CDK needs!
const { App } = require("unicdk");

// one large scale project later:
const cdk = require("aws-cdk-lib");
const cdktf = require("cdktf");
const cdk8s = require("cdk8s");
const { AwsProvider } = require("@cdktf/provider-aws/lib/provider");
const { S3Bucket } = require("@cdktf/provider-aws/lib/s3-bucket");
const { Instance } = require("@cdktf/provider-aws/lib/instance");
const { ApiObject } = require("cdk8s");
const { Bucket } = require("aws-cdk-lib/aws-s3");

const uniApp = new App();

class MyStack extends cdk.Stack {
  constructor(scope, id = "MyStack") {
    super(scope, id);
    new Bucket(this, "MyBucket");
  }
}

class MyOtherStack extends cdk.Stack {
  constructor(scope, id = "MyOtherStack") {
    super(scope, id);
    new Bucket(this, "MyOtherBucket1");
    new Bucket(this, "MyOtherBucket2");
  }
}

class MyTerraformStack extends cdktf.TerraformStack {
  constructor(scope, id = "MyTerraformStack") {
    super(scope, id);
    new AwsProvider(this, "aws");
    new S3Bucket(this, "MyTerraformBucket");
    new Instance(this, "MyTerraformInstance", {
      ami: "ami-2757f631",
      instanceType: "t2.micro",
    });
    new MyOtherStack(this); // nested CDK stack in a Terraform stack!
  }
}

class MyChart extends cdk8s.Chart {
  constructor(scope, id = "MyChart") {
    super(scope, id);
    new ApiObject(this, "resource1", { kind: "Resource1", apiVersion: "v1" });
    new ApiObject(this, "resource2", { kind: "Resource2", apiVersion: "v1" });
    new MyTerraformStack(this); // nested terraform stack!
  }
}

new MyStack(uniApp);
new MyChart(uniApp);

// synthesize all stacks in the unicdk app at once
uniApp.synth();
```
