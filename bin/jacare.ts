#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StaticWebsiteHostingStack } from "../lib/static-website-hosting-stack";
import { CostStack } from "../lib/cost-stack";
import Config from "../config";

const app = new cdk.App();
const env = {
  account: process.env.AWS_GGRANGEL_ACCOUNT,
  region: Config.AWS_REGION,
};

new StaticWebsiteHostingStack(app, "StaticWebsiteHostingStack", { env });
new CostStack(app, "CostStack", { env });
