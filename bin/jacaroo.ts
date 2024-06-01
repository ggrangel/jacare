#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebsiteStack } from "../lib/website-stack";
import { CostStack } from "../lib/cost-stack";

const app = new cdk.App();
const env = {
  account: process.env.AWS_GGRANGEL_ACCOUNT,
  region: "us-east-1",
};

new WebsiteStack(app, "WebsiteStack", { env });
new CostStack(app, "CostStack", { env });
