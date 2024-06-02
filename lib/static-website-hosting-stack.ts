import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_route53_targets as route53Targets } from "aws-cdk-lib";
import { aws_certificatemanager as acm } from "aws-cdk-lib";
import { aws_cloudfront as cloudfront } from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_route53 as route53 } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { aws_s3_deployment as s3deploy } from "aws-cdk-lib";
import Config from "../config";

export class StaticWebsiteHostingStack extends Stack {
  private hostedZone: route53.IHostedZone;
  private websiteBucket: s3.Bucket;
  private acmCertificate: acm.Certificate;
  private cfDistribution: cloudfront.CloudFrontWebDistribution;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.hostedZone = this.getHostedZone();
    this.websiteBucket = this.createS3WebsiteBucket();
    this.acmCertificate = this.createAcmCertificate();
    this.cfDistribution = this.createCloudFrontDistribution();
    this.createDnsRecords();
    this.deployWebsite();
  }

  /**
      Hosted zones are used to add and store DNS records, which are
      instructions within DNS servers that provide information about a domain,
      including what IP address it is associated with, and how to handle requests for it.
      There are several types of DNS records, including:
      - A records: Maps a domain to an IPv4 address.
      - AAAA records: Maps a domain to an IPv6 address.
      - CNAME records: Maps a domain to another domain (does not provide the IP adress)
      - MX records: Maps a domain to a mail server.
        -  A mail server is a server that sends and receives email.
      - NS records: Maps a domain to a name server.
        - A name server is a server that translates domain names into IP addresses.
      - TXT records: Used to store arbitrary text data. 
      - SOA records: Stores information about the DNS zone.
  
      Pricing: 
      - $0.50 per hosted zone per month for the first 25 hosted zones.
      - $0.40 per million queries – first 1 billion queries / month.
      */
  private getHostedZone() {
    // AWS already created a HostedZone when I registered the domain in Route53.
    // So we only need to look it up instead of creating one.
    return route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: Config.APEX_DOMAIN,
    });
  }

  private createS3WebsiteBucket(): s3.Bucket {
    return new s3.Bucket(this, "WebsiteBucket", {
      // bucket names must be globally unique
      bucketName: `static-website-bucket-${Config.APEX_DOMAIN}`,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private deployWebsite(): void {
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset(Config.WEBSITE_BUILD_PATH)],
      destinationBucket: this.websiteBucket,
    });
  }

  /** Manages SSL/TLS certicates, enhancing the connection security between the client and the server.
    SSL and its successor TLS are industry standard protocols for encrypting network communcations
    and establishing the identity of websites over the internet. SSL/TLS encrypts sensitive dta
    in transit and provides the authentication using SSL/TLS certificates. AWS Certificate Manager
    provisions and manages these certificates so that we can configure a website or application using
    SSL/TLS protocol.
    ACM Certificate pricing: 
    - Free for the first 12 months.
    - $0.75 per month after the first 12 months.
    - $0.10 per certificate validation.
    */
  private createAcmCertificate(): acm.Certificate {
    const alternativeNames = Config.SUBDOMAINS.map(
      (s) => `${s}.${Config.APEX_DOMAIN}`,
    );

    return new acm.Certificate(this, "WebsiteCertificate", {
      domainName: Config.APEX_DOMAIN,
      subjectAlternativeNames: alternativeNames,
      certificateName: "Static Website Certificate",
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
  }

  /**
   Amazon CloudFront pricing is based on the three things:
   the amount of data you transfer to your end users,
   the number of user requests (for both http and https content),
   and the CloudFront locations you use (which will depend on the global diversity of your users).
 */
  private createCloudFrontDistribution(): cloudfront.CloudFrontWebDistribution {
    /* OAI are a special CloudFront user designed to allow CloudFront to access S3 buckets.
    It automatically integrates with S3 bucket policies, simplifying access control
    */
    const oai = new cloudfront.OriginAccessIdentity(this, "OAI");

    const aliases = [
      Config.APEX_DOMAIN,
      ...Config.SUBDOMAINS.map((s) => `${s}.${Config.APEX_DOMAIN}`),
    ];

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "WebsiteDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: this.websiteBucket,
              originAccessIdentity: oai,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                viewerProtocolPolicy:
                  cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              },
            ],
          },
        ],
        viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
          this.acmCertificate,
          {
            aliases: aliases,
          },
        ),
      },
    );

    this.websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.websiteBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId,
          ),
        ],
      }),
    );

    return distribution;
  }

  private createDnsRecords(): void {
    const aRecord = new route53.ARecord(
      this,
      "CloudfrontDistributionAAliasRecord",
      {
        zone: this.hostedZone,
        recordName: Config.APEX_DOMAIN,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.cfDistribution),
        ),
      },
    );

    const aaaaRecord = new route53.AaaaRecord(
      this,
      "CloudfrontDistributionAaaaAliasRecord",
      {
        zone: this.hostedZone,
        recordName: Config.APEX_DOMAIN,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.cfDistribution),
        ),
      },
    );

    for (const subdomain of Config.SUBDOMAINS) {
      new route53.ARecord(this, `${subdomain}ARecord`, {
        zone: this.hostedZone,
        recordName: `${subdomain}.${Config.APEX_DOMAIN}`,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.Route53RecordTarget(aRecord),
        ),
      });

      new route53.AaaaRecord(this, `${subdomain}AaaaRecord`, {
        zone: this.hostedZone,
        recordName: `${subdomain}.${Config.APEX_DOMAIN}`,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.Route53RecordTarget(aaaaRecord),
        ),
      });
    }
  }
}
