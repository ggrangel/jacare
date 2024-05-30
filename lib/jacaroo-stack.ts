import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_route53 as route53 } from "aws-cdk-lib";
import Config from "../config";

export class WebsiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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
    - SOA records: Stores information about the DNS/Hosted zone.

    Pricing: 
    - $0.50 per hosted zone per month for the first 25 hosted zones.
    - $0.40 per million queries – first 1 billion queries / month.
    */
    const hostedZone = new route53.HostedZone(this, "HostedZone", {
      zoneName: Config.DOMAIN_NAME,
    });

    new route53.RecordSet(this, "NSRecordSet", {
      recordType: route53.RecordType.NS,
      target: route53.RecordTarget.fromValues(...Config.NAME_SERVERS),
      zone: hostedZone,
      recordName: Config.DOMAIN_NAME,
    });
  }
}
