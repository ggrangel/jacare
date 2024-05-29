#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { JacarooStack } from "../lib/jacaroo-stack";

const app = new cdk.App();
new JacarooStack(app, "JacarooStack", {
  env: {
    account: "058264458914",
    region: "us-east-1",
  },
});
