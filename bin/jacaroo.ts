#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebsiteStack } from "../lib/jacaroo-stack";

const app = new cdk.App();
new WebsiteStack(app, "WebsiteStack", {
  env: {
    account: process.env.AWS_GGRANGEL_ACCOUNT,
    region: "us-east-1",
  },
});
