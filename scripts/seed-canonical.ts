import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Canonical question seeder.
//
// Loads the hand-curated "spine" of the SAA-C03 question pool — adapted from
// official AWS sources (sample exam, Exam Readiness, FAQ sections of relevant
// whitepapers). Each question is tagged with:
//   - concept_slug         : must exist in lib/knowledge-graph/aws-saa.ts
//   - blueprint_task_id    : official SAA-C03 task statement (1.1, 2.2, ...)
//   - pattern_tag          : one of the 20 categorical labels (see migration 036)
//   - is_canonical         : true (this entire batch)
//   - variation_seed       : stable per-question id for future variants
//   - expected_distractor_type : per-option wrong-reasoning labels for the
//                                 digital-twin distractor_pattern dimension
//
// Idempotent: a `--reset` flag wipes existing is_canonical rows and re-inserts.
// Without flag: noop on duplicates (matched by variation_seed).
//
// CLI:
//   tsx scripts/seed-canonical.ts                  # insert (skip dupes by seed)
//   tsx scripts/seed-canonical.ts --reset          # wipe canonical + reinsert
//   tsx scripts/seed-canonical.ts --dry-run        # validate only, no DB write

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  })
)
const RESET = args['reset'] === 'true'
const DRY_RUN = args['dry-run'] === 'true'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type DistractorType =
  | 'underestimates-availability'
  | 'ignores-cost-in-multi-region'
  | 'confuses-async-with-sync'
  | 'over-engineers-solution'
  | 'static-when-dynamic-needed'
  | 'manual-when-managed-exists'
  | 'wrong-storage-tier'
  | 'wrong-encryption-scope'
  | 'iam-user-when-role-needed'
  | 'public-when-private-needed'
  | 'sync-when-decoupled-needed'
  | 'compute-when-serverless-fits'
  | 'wrong-region-scope'
  | 'misses-compliance-requirement'
  | 'wrong-rpo-rto-match'
  | 'over-permissive-iam'
  | 'misuses-caching'
  | 'wrong-load-balancer-type'
  | 'misses-durability-tier'
  | 'wrong-network-topology'
  | 'monitoring-observability'

type PatternTag =
  | 'most-cost-effective'
  | 'least-operational-overhead'
  | 'highest-availability'
  | 'most-secure'
  | 'lowest-latency'
  | 'highest-throughput'
  | 'dr-rpo-rto'
  | 'migrate-minimal-disruption'
  | 'compliance-immutable'
  | 'event-driven-decoupling'
  | 'cross-account-access'
  | 'fault-tolerant-design'
  | 'scalable-elastic'
  | 'caching-strategy'
  | 'serverless-vs-container'
  | 'storage-tier-selection'
  | 'network-segmentation'
  | 'identity-federation'
  | 'data-encryption'
  | 'monitoring-observability'

interface CanonicalQuestion {
  variationSeed: string  // canonical-NNN
  conceptSlug: string
  blueprintTaskId: string
  patternTag: PatternTag
  difficulty: number  // 0-1
  questionText: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  // Index parallel to options; correctIndex slot is null.
  expectedDistractorType: (
    | { type: DistractorType; explanation: string }
    | null
  )[]
}

// ---------------------------------------------------------------------------
// SECURE ARCHITECTURE — 15 questions (30% blueprint weight)
// ---------------------------------------------------------------------------

const SECURE_QUESTIONS: CanonicalQuestion[] = [
  // ---- 1.1 Design secure access to AWS resources (5) ----
  {
    variationSeed: 'canonical-001',
    conceptSlug: 'iam-roles-vs-policies',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.4,
    questionText: 'A web application running on Amazon EC2 needs to read objects from an S3 bucket. The development team is debating how to grant the application access. Which approach is the MOST SECURE?',
    options: [
      'Create an IAM user with a programmatic access key, store the access key and secret in environment variables on the EC2 instance.',
      'Attach an IAM role with an S3 read policy to the EC2 instance.',
      'Embed the IAM access key and secret directly in the application code so they cannot be read by other processes.',
      'Make the S3 bucket public-read so the application can fetch objects without credentials.',
    ],
    correctIndex: 1,
    explanation: 'IAM roles attached to EC2 instances deliver short-lived credentials via the instance metadata service, with automatic rotation and no long-lived secrets. Storing access keys in env vars or code creates rotation/leak risk. Public buckets expose data to anyone on the internet, violating least privilege.',
    expectedDistractorType: [
      { type: 'iam-user-when-role-needed', explanation: 'Long-lived credentials need rotation and can leak.' },
      null,
      { type: 'over-permissive-iam', explanation: 'Hardcoded secrets are the worst credential antipattern.' },
      { type: 'public-when-private-needed', explanation: 'Public buckets violate least-privilege fundamentally.' },
    ],
  },
  {
    variationSeed: 'canonical-002',
    conceptSlug: 'iam-identity-center-sso',
    blueprintTaskId: '1.1',
    patternTag: 'identity-federation',
    difficulty: 0.5,
    questionText: 'A company has 12 AWS accounts under a single AWS Organization and wants employees to log in once with their corporate Microsoft Entra ID (formerly Azure AD) credentials and gain role-based access to each account. Which solution requires the LEAST operational overhead?',
    options: [
      'Create matching IAM users in every account and configure each one to federate via SAML 2.0 directly with Entra ID.',
      'Use IAM Identity Center with Entra ID as the external identity provider and assign permission sets to AWS accounts.',
      'Run a self-managed SAML proxy on EC2 that brokers tokens between Entra ID and each account separately.',
      'Issue a long-lived programmatic access key per employee per account and rotate them quarterly.',
    ],
    correctIndex: 1,
    explanation: 'IAM Identity Center centralizes SSO across all org accounts with one Entra ID integration; permission sets map to roles in target accounts automatically. Per-account IAM users would multiply admin work by 12. A self-managed SAML proxy adds undifferentiated infrastructure. Programmatic keys for human users break the access-key best practice.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Per-account user duplication is exactly what Identity Center eliminates.' },
      null,
      { type: 'over-engineers-solution', explanation: 'Self-managed proxy reinvents Identity Center.' },
      { type: 'iam-user-when-role-needed', explanation: 'Long-lived keys for humans is anti-pattern.' },
    ],
  },
  {
    variationSeed: 'canonical-003',
    conceptSlug: 'scp-organizations',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.6,
    questionText: 'A security team must guarantee that no member account in the AWS Organization can launch EC2 instances in regions outside the EU, regardless of any IAM policies attached to users or roles. Which control achieves this?',
    options: [
      'Attach an IAM policy that denies non-EU regions to every IAM user in every account.',
      'Configure CloudTrail event alarms that page on-call when an EC2 instance is launched outside the EU.',
      'Apply a Service Control Policy at the OU level that denies ec2:RunInstances when aws:RequestedRegion is not in the EU set.',
      'Set the AWS Region in each account console to an EU region so the default region cannot be changed.',
    ],
    correctIndex: 2,
    explanation: 'SCPs apply at the Organization level and create a hard ceiling — no IAM policy in a member account can grant what the SCP denies. Per-user IAM denies miss roles, programmatic actors, and root. CloudTrail alarms detect after the fact, not prevent. Console default region is a UI preference, not a control.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Per-user policies miss roles and root.' },
      { type: 'monitoring-observability', explanation: 'Detection is not prevention.' },
      null,
      { type: 'over-permissive-iam', explanation: 'UI default is not a security control.' },
    ],
  },
  {
    variationSeed: 'canonical-004',
    conceptSlug: 'iam-permissions-boundaries',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.75,
    questionText: 'Developers in account A need permission to create IAM roles for their Lambda functions, but the security team wants to ensure the roles they create can never grant more than read access to a specific set of S3 buckets. Which mechanism enforces this constraint?',
    options: [
      'Attach an IAM policy to the developers that allows iam:CreateRole and rely on code review to catch overly permissive roles.',
      'Configure a Service Control Policy at the OU level that denies all iam:CreateRole calls.',
      'Require developers to attach a permissions boundary to every role they create that limits the maximum effective permissions.',
      'Have the security team manually create every Lambda role on the developers\' behalf.',
    ],
    correctIndex: 2,
    explanation: 'Permissions boundaries cap the MAXIMUM permissions a created identity can have, regardless of attached policies. Code review is reactive, not preventive. Denying CreateRole entirely blocks the legitimate use case. Centralized role creation creates a bottleneck. The boundary lets developers self-serve safely.',
    expectedDistractorType: [
      { type: 'monitoring-observability', explanation: 'Code review is reactive, not a hard control.' },
      { type: 'over-engineers-solution', explanation: 'Blocking the action defeats the use case.' },
      null,
      { type: 'manual-when-managed-exists', explanation: 'Manual creation is a workflow bottleneck.' },
    ],
  },
  {
    variationSeed: 'canonical-005',
    conceptSlug: 'cognito',
    blueprintTaskId: '1.1',
    patternTag: 'identity-federation',
    difficulty: 0.55,
    questionText: 'A consumer mobile app needs to let end users sign up with email/password OR with their Google account, and then call AWS Lambda-backed APIs on behalf of the authenticated user. Which AWS service combination is purpose-built for this?',
    options: [
      'Amazon Cognito User Pools for sign-up and sign-in, plus Cognito Identity Pools to exchange the JWT for temporary AWS credentials.',
      'AWS IAM Identity Center with each end user as a workforce identity, plus per-user IAM access keys distributed in the app.',
      'Provision an IAM user per app user using a backend signup endpoint, then ship the access key into the mobile app on login.',
      'Use AWS Directory Service Managed Microsoft AD as the user directory and have the mobile app authenticate via LDAP.',
    ],
    correctIndex: 0,
    explanation: 'Cognito User Pools is the customer-identity (CIAM) service and supports email/password plus social federation. Identity Pools then vend short-lived AWS credentials so the app can call signed APIs. IAM Identity Center is for workforce SSO, not consumer apps. IAM users-per-end-user does not scale and exposes long-lived keys. Managed AD is for Windows-style internal directories.',
    expectedDistractorType: [
      null,
      { type: 'iam-user-when-role-needed', explanation: 'Identity Center is for employees, not customers.' },
      { type: 'iam-user-when-role-needed', explanation: 'Per-end-user IAM users is a known anti-pattern.' },
      { type: 'over-engineers-solution', explanation: 'AD is for internal employee directories.' },
    ],
  },

  // ---- 1.2 Design secure workloads and applications (5) ----
  {
    variationSeed: 'canonical-006',
    conceptSlug: 'security-groups-vs-nacls',
    blueprintTaskId: '1.2',
    patternTag: 'network-segmentation',
    difficulty: 0.55,
    questionText: 'A solutions architect needs to block a single malicious public IP (203.0.113.45) from reaching ANY instance in a particular subnet, while leaving all other rules unchanged. Which approach is correct?',
    options: [
      'Add an explicit deny rule for 203.0.113.45/32 in the security group attached to every instance in the subnet.',
      'Add an inbound deny rule for 203.0.113.45/32 with a low rule number on the Network ACL associated with the subnet.',
      'Disable the subnet route table entry that points to the internet gateway.',
      'Modify the VPC endpoint policy to deny the offending IP at the gateway level.',
    ],
    correctIndex: 1,
    explanation: 'NACLs are the only stateful/stateless boundary that supports DENY rules at the subnet level — security groups are allow-only. Disabling the IGW route blocks ALL internet traffic, not just the bad IP. VPC endpoints are for private connectivity to AWS services, not internet ingress filtering.',
    expectedDistractorType: [
      { type: 'wrong-network-topology', explanation: 'Security groups have no DENY rule.' },
      null,
      { type: 'over-engineers-solution', explanation: 'Cuts off all internet, not just one IP.' },
      { type: 'wrong-network-topology', explanation: 'VPC endpoints are not for internet filtering.' },
    ],
  },
  {
    variationSeed: 'canonical-007',
    conceptSlug: 'shield-waf',
    blueprintTaskId: '1.2',
    patternTag: 'most-secure',
    difficulty: 0.55,
    questionText: 'A public-facing application running behind Application Load Balancer is receiving SQL-injection attempts and HTTP floods from a botnet. The team needs a managed solution that inspects HTTP layer payloads AND scales DDoS protection. Which combination is appropriate?',
    options: [
      'Enable AWS Shield Standard only and rely on its automatic Layer 7 DDoS detection.',
      'Attach AWS WAF rules to the ALB for SQLi and rate-based blocking, and subscribe to AWS Shield Advanced for enhanced DDoS protection and SOC support.',
      'Move the ALB behind a Network Load Balancer and rely on TCP-level filtering.',
      'Block all traffic with a Network ACL and whitelist allowed IPs manually.',
    ],
    correctIndex: 1,
    explanation: 'WAF is the L7 filter for SQLi/XSS/rate-limiting; Shield Advanced upgrades DDoS protections to include cost protection, 24/7 SRT support, and L7 mitigations. Shield Standard alone has no L7 inspection. NLB is L4 and can\'t inspect HTTP payloads. Manual IP allowlisting doesn\'t scale and breaks public access.',
    expectedDistractorType: [
      { type: 'misses-compliance-requirement', explanation: 'Shield Standard has no L7 inspection.' },
      null,
      { type: 'wrong-load-balancer-type', explanation: 'NLB is L4, can\'t see HTTP payload.' },
      { type: 'over-engineers-solution', explanation: 'Manual allowlist breaks public access.' },
    ],
  },
  {
    variationSeed: 'canonical-008',
    conceptSlug: 'guardduty',
    blueprintTaskId: '1.2',
    patternTag: 'monitoring-observability',
    difficulty: 0.5,
    questionText: 'Compliance requires the security team to detect compromised EC2 instances mining cryptocurrency, communication with known malicious IPs, and unusual API calls from leaked credentials — across all 30 AWS accounts in the Organization, with the LEAST operational overhead.',
    options: [
      'Deploy a custom IDS agent on every EC2 instance and aggregate logs to a central SIEM.',
      'Enable Amazon GuardDuty in every account from the Organizations management account and centralize findings via the delegated administrator pattern.',
      'Run nightly Athena queries against VPC Flow Logs and CloudTrail manually written to detect known patterns.',
      'Subscribe to a third-party threat intel feed and feed it into Lambda functions that scan the environment hourly.',
    ],
    correctIndex: 1,
    explanation: 'GuardDuty is purpose-built for this — it analyzes CloudTrail, VPC Flow Logs, DNS logs, and EKS audit logs with ML and AWS threat-intel feeds, with org-wide enablement via the delegated admin in one click. Custom IDS adds undifferentiated agent management. Hand-written Athena queries cover only known patterns. Third-party feeds duplicate AWS-managed feeds and require additional integration code.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Custom IDS reinvents GuardDuty.' },
      null,
      { type: 'over-engineers-solution', explanation: 'Hand-written queries miss novel patterns.' },
      { type: 'over-engineers-solution', explanation: 'Adds integration burden, no upside.' },
    ],
  },
  {
    variationSeed: 'canonical-009',
    conceptSlug: 'inspector',
    blueprintTaskId: '1.2',
    patternTag: 'monitoring-observability',
    difficulty: 0.45,
    questionText: 'A DevOps team needs continuous CVE vulnerability scanning across hundreds of EC2 instances and every container image pushed to Amazon ECR, with prioritized findings, BEFORE images are deployed to production.',
    options: [
      'Run an open-source scanner manually before each release and record findings in a spreadsheet.',
      'Enable Amazon Inspector to automatically scan EC2, ECR images on push, and Lambda functions.',
      'Use Amazon Macie to scan EC2 instances and ECR repositories.',
      'Configure AWS Config rules to detect outdated software packages.',
    ],
    correctIndex: 1,
    explanation: 'Inspector is the AWS-native vulnerability assessment service; it automatically scans EC2, ECR images on push, and Lambda layers, and prioritizes by CVSS-derived score. Macie detects PII in S3, not vulnerabilities. AWS Config evaluates resource configuration drift, not OS/library CVEs. Manual scanning doesn\'t scale.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Manual workflows don\'t scale.' },
      null,
      { type: 'misses-compliance-requirement', explanation: 'Macie is for PII, not CVEs.' },
      { type: 'over-engineers-solution', explanation: 'Config sees resource state, not package versions.' },
    ],
  },
  {
    variationSeed: 'canonical-010',
    conceptSlug: 'vpc-endpoints',
    blueprintTaskId: '1.2',
    patternTag: 'network-segmentation',
    difficulty: 0.6,
    questionText: 'A workload in private subnets needs to call Amazon S3 frequently with high throughput. The team must ensure the traffic NEVER traverses the public internet AND minimize NAT Gateway data-processing charges.',
    options: [
      'Add a NAT Gateway and route 0.0.0.0/0 through it for S3 traffic.',
      'Provision an S3 Gateway VPC Endpoint and update route tables to direct S3-prefix traffic to it.',
      'Configure a Site-to-Site VPN to AWS regions hosting the S3 service.',
      'Use AWS Direct Connect public VIF to reach S3 over a dedicated link.',
    ],
    correctIndex: 1,
    explanation: 'S3 Gateway Endpoints route traffic over the AWS private network at no per-GB cost (only the standard S3 pricing). NAT Gateway works but incurs hourly + per-GB processing charges. VPN/Direct Connect public VIF reach S3 publicly but add complexity for a problem already solved by gateway endpoints.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'NAT Gateway adds processing charges.' },
      null,
      { type: 'over-engineers-solution', explanation: 'VPN is for hybrid, not in-region private S3.' },
      { type: 'over-engineers-solution', explanation: 'DX overshoots for private VPC-to-S3.' },
    ],
  },

  // ---- 1.3 Determine appropriate data security controls (5) ----
  {
    variationSeed: 'canonical-011',
    conceptSlug: 'kms-encryption',
    blueprintTaskId: '1.3',
    patternTag: 'data-encryption',
    difficulty: 0.5,
    questionText: 'A regulated workload requires that all data in an S3 bucket be encrypted at rest with a customer-managed key, AND that the security team maintain full control over key rotation and key-policy access, separate from the bucket owner. Which configuration meets the requirements?',
    options: [
      'Use SSE-S3 (Amazon S3 managed keys) and rely on AWS-managed rotation.',
      'Use SSE-KMS with a customer-managed KMS key whose key policy grants decrypt to the workload role and key administration to the security team only.',
      'Use client-side encryption with the AWS-managed alias/aws/s3 key.',
      'Disable server-side encryption and rely on TLS in transit only.',
    ],
    correctIndex: 1,
    explanation: 'A customer-managed CMK lets the security team control rotation, deletion, and the key policy independently from the bucket — the textbook separation-of-duties pattern. SSE-S3 is AWS-controlled, not customer-controlled. The aws/s3 alias is also AWS-managed and not policy-isolatable from the account owner. TLS-in-transit doesn\'t address at-rest encryption.',
    expectedDistractorType: [
      { type: 'wrong-encryption-scope', explanation: 'SSE-S3 means AWS controls key, not security team.' },
      null,
      { type: 'wrong-encryption-scope', explanation: 'aws/s3 alias is AWS-managed, no separation.' },
      { type: 'misses-compliance-requirement', explanation: 'TLS does not encrypt at rest.' },
    ],
  },
  {
    variationSeed: 'canonical-012',
    conceptSlug: 'secrets-manager',
    blueprintTaskId: '1.3',
    patternTag: 'most-secure',
    difficulty: 0.5,
    questionText: 'A Lambda function reads a database password every invocation. Compliance requires the password to rotate every 30 days without manual intervention or application restarts. Which approach satisfies the requirement?',
    options: [
      'Store the password as an environment variable on the Lambda function and update it manually each month.',
      'Store the password in AWS Secrets Manager with automatic rotation enabled and reference the secret from the Lambda code.',
      'Store the password in plain text in S3 and read it on cold start only.',
      'Embed the password in the Lambda deployment package and redeploy each month.',
    ],
    correctIndex: 1,
    explanation: 'Secrets Manager supports built-in automatic rotation (Lambda-driven for RDS/DocumentDB/Redshift) with no application restart needed; the Lambda fetches the current value via the SDK and AWS handles versioning. Env vars require redeploys to change. S3 plaintext violates encryption-at-rest. Embedding in package guarantees secrets in source control.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Manual monthly updates breaks compliance.' },
      null,
      { type: 'wrong-encryption-scope', explanation: 'Plaintext in S3 is not encryption.' },
      { type: 'manual-when-managed-exists', explanation: 'Secrets in deployment package = leaked secrets.' },
    ],
  },
  {
    variationSeed: 'canonical-013',
    conceptSlug: 's3-object-lock',
    blueprintTaskId: '1.3',
    patternTag: 'compliance-immutable',
    difficulty: 0.55,
    questionText: 'A financial services firm must store transaction logs in S3 for SEC 17a-4(f) compliance: the logs cannot be deleted or modified by ANY user — including the AWS root user — for 7 years. Which configuration satisfies the regulation?',
    options: [
      'Apply an S3 bucket policy that denies s3:DeleteObject to all principals.',
      'Enable S3 Versioning and rely on previous versions to recover from accidental deletes.',
      'Enable S3 Object Lock in compliance mode with a 7-year default retention period at bucket creation time.',
      'Move objects to S3 Glacier Deep Archive and rely on retrieval delays to discourage deletion.',
    ],
    correctIndex: 2,
    explanation: 'Object Lock COMPLIANCE mode is the only configuration that even the root user cannot bypass — it is purpose-built for SEC 17a-4(f), FINRA, and CFTC retention requirements. Bucket policies can be modified by the root user. Versioning preserves prior versions but does not prevent deletion of the latest. Glacier tier alone has no retention enforcement.',
    expectedDistractorType: [
      { type: 'misses-compliance-requirement', explanation: 'Root can change bucket policy.' },
      { type: 'misses-compliance-requirement', explanation: 'Versioning != immutability.' },
      null,
      { type: 'misses-compliance-requirement', explanation: 'Glacier is a tier, not a retention control.' },
    ],
  },
  {
    variationSeed: 'canonical-014',
    conceptSlug: 'macie',
    blueprintTaskId: '1.3',
    patternTag: 'monitoring-observability',
    difficulty: 0.45,
    questionText: 'A retail company stores millions of customer records in S3 across hundreds of buckets and is preparing for a GDPR audit. They need to identify which buckets contain personally identifiable information (PII) such as names, emails, and credit card numbers.',
    options: [
      'Use Amazon Macie to scan S3 buckets for managed PII data identifiers and produce findings.',
      'Use Amazon GuardDuty in S3-protection mode to alert on PII access.',
      'Use Amazon Inspector to scan S3 objects for malware and vulnerabilities.',
      'Use AWS Config managed rules to detect public buckets.',
    ],
    correctIndex: 0,
    explanation: 'Macie is the AWS-native data discovery service for S3 — it uses managed and custom data identifiers to find PII, PHI, and credentials, with severity-classified findings exportable to Security Hub. GuardDuty detects threats (compromised instances, malicious IPs), not data classification. Inspector targets EC2/ECR/Lambda vulnerabilities. AWS Config detects misconfiguration like public buckets but not PII content.',
    expectedDistractorType: [
      null,
      { type: 'misses-compliance-requirement', explanation: 'GuardDuty detects threats, not PII content.' },
      { type: 'misses-compliance-requirement', explanation: 'Inspector targets infra, not data classification.' },
      { type: 'misses-compliance-requirement', explanation: 'Config sees configuration, not object content.' },
    ],
  },
  {
    variationSeed: 'canonical-015',
    conceptSlug: 'acm-certificate-manager',
    blueprintTaskId: '1.3',
    patternTag: 'data-encryption',
    difficulty: 0.4,
    questionText: 'A team is launching a new public website behind a CloudFront distribution and needs a free, AWS-managed TLS certificate that auto-renews. The website domain is hosted in Route 53.',
    options: [
      'Request an ACM public certificate in us-east-1 with DNS validation, then attach it to the CloudFront distribution.',
      'Request an ACM public certificate in the same region as the origin and rely on CloudFront to fetch it cross-region.',
      'Generate a self-signed certificate, upload it to IAM, and reference the IAM certificate ARN in CloudFront.',
      'Purchase a certificate from a commercial CA and import it into ACM with auto-renewal enabled.',
    ],
    correctIndex: 0,
    explanation: 'CloudFront reads ACM certificates only from us-east-1 (N. Virginia), regardless of the distribution\'s edge locations. DNS validation is the recommended path because ACM can auto-renew without human intervention. Same-region requests don\'t work for CloudFront. Self-signed certs cause browser warnings. Imported third-party certs require manual reimport at renewal — ACM can\'t auto-renew them.',
    expectedDistractorType: [
      null,
      { type: 'wrong-region-scope', explanation: 'CloudFront only reads ACM in us-east-1.' },
      { type: 'misses-compliance-requirement', explanation: 'Self-signed = browser errors.' },
      { type: 'manual-when-managed-exists', explanation: 'Imported certs require manual renewal.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// RESILIENT ARCHITECTURE — 13 questions (26% blueprint weight)
// ---------------------------------------------------------------------------

const RESILIENT_QUESTIONS: CanonicalQuestion[] = [
  // ---- 2.1 Design scalable and loosely coupled (7) ----
  {
    variationSeed: 'canonical-016',
    conceptSlug: 'sqs-vs-sns-vs-eventbridge',
    blueprintTaskId: '2.1',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.55,
    questionText: 'An e-commerce platform must decouple its order-placement service from inventory, billing, and notification services so each can be deployed and scaled independently. The same order event must be processed by ALL THREE downstream services with at-least-once delivery and per-consumer retry.',
    options: [
      'Place each downstream service behind its own SQS queue and have the producer call SQS.SendMessage three times — once per queue.',
      'Publish each order to an SNS topic with three SQS queues subscribed (one per consumer); each consumer reads from its own queue.',
      'Have the producer invoke each consumer via direct synchronous HTTPS Lambda calls.',
      'Write each order to S3 and have the consumers periodically poll the bucket.',
    ],
    correctIndex: 1,
    explanation: 'The SNS-fanout-to-SQS pattern is the canonical fan-out: the producer publishes once, SNS replicates to each subscriber queue, each consumer scales independently with its own retry/DLQ. Producer calling SQS three times tightly couples it to the consumer count. Synchronous calls violate the decoupling requirement. S3 polling adds latency and lacks ordering/retry semantics.',
    expectedDistractorType: [
      { type: 'sync-when-decoupled-needed', explanation: 'Producer must know all consumers.' },
      null,
      { type: 'sync-when-decoupled-needed', explanation: 'Direct HTTPS = tight coupling.' },
      { type: 'over-engineers-solution', explanation: 'Polling is high-latency and lacks retry.' },
    ],
  },
  {
    variationSeed: 'canonical-017',
    conceptSlug: 'step-functions',
    blueprintTaskId: '2.1',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.6,
    questionText: 'A loan-approval workflow has 8 sequential steps, each of which calls a separate Lambda function, may take seconds-to-minutes, and must wait for human approval at step 5. The team wants visual auditability and built-in retry/error handling.',
    options: [
      'Have Lambda #1 invoke Lambda #2 directly via the SDK, and so on, with retries implemented manually in each function.',
      'Trigger an AWS Step Functions Standard workflow that orchestrates each Lambda with task tokens for the human approval step.',
      'Run all 8 steps as a single monolithic Lambda function with a 15-minute timeout.',
      'Use SQS queues between every pair of Lambdas with custom retry policies on each queue.',
    ],
    correctIndex: 1,
    explanation: 'Step Functions Standard workflows are designed exactly for this — visual state machine with built-in retry/catch, integrations with 200+ AWS services, and the .waitForTaskToken pattern for human approval that pauses the workflow without burning compute. Lambda-chains require custom error handling and lose visibility. A single monolith Lambda is brittle and limited to 15 min. SQS-only chains hide ordering and lack approval primitives.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Hand-rolled retry per Lambda is fragile.' },
      null,
      { type: 'over-engineers-solution', explanation: 'Monolith breaks on first long step.' },
      { type: 'over-engineers-solution', explanation: 'SQS is wrong primitive for orchestration.' },
    ],
  },
  {
    variationSeed: 'canonical-018',
    conceptSlug: 'ec2-auto-scaling',
    blueprintTaskId: '2.1',
    patternTag: 'scalable-elastic',
    difficulty: 0.5,
    questionText: 'A web tier on EC2 behind an Application Load Balancer experiences traffic that doubles every weekday between 9 AM and 11 AM and drops to baseline overnight. The team wants compute capacity to ramp up BEFORE the spike and ramp down at night without manual intervention.',
    options: [
      'Manually launch additional EC2 instances each morning and terminate them at night.',
      'Configure an Auto Scaling group with both a scheduled scaling action that pre-warms capacity at 8:45 AM and a target-tracking policy on average CPU utilization.',
      'Provision the maximum required capacity 24×7 to ensure peak performance.',
      'Use Lambda functions exclusively, since they auto-scale instantly with no warmup needed.',
    ],
    correctIndex: 1,
    explanation: 'Combining scheduled actions (predictable daily pattern) with target-tracking on CPU (reactive within the day) covers both the foreseeable spike and any deviation. Manual scaling violates the "no manual intervention" requirement. 24×7 max capacity wastes 70%+ of cost. Lambda is a different runtime model — refactoring a web tier to Lambda is a much bigger change than the question scope.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Question excludes manual ops.' },
      null,
      { type: 'ignores-cost-in-multi-region', explanation: 'Pays for unused capacity at night.' },
      { type: 'over-engineers-solution', explanation: 'Refactor to Lambda is out of scope.' },
    ],
  },
  {
    variationSeed: 'canonical-019',
    conceptSlug: 'ecs-vs-eks-vs-fargate',
    blueprintTaskId: '2.1',
    patternTag: 'serverless-vs-container',
    difficulty: 0.55,
    questionText: 'A team has 12 containerized microservices and wants to run them on AWS without managing EC2 instances, patching the OS, or capacity-planning the cluster. They use the Docker Compose-style ECS task definition and have no Kubernetes expertise.',
    options: [
      'Run the services on Amazon EKS with self-managed worker nodes and a custom AMI.',
      'Run the services on Amazon ECS with the Fargate launch type.',
      'Run the services on EC2 instances using Auto Scaling groups and install Docker manually.',
      'Build AMIs with the containers baked in and skip the orchestrator.',
    ],
    correctIndex: 1,
    explanation: 'ECS + Fargate gives serverless container hosting with no node management — exactly the requirement. EKS requires Kubernetes expertise the team lacks. EC2 + manual Docker is the opposite of "no instance management." AMI-baked containers re-create deploy/orchestration manually.',
    expectedDistractorType: [
      { type: 'over-engineers-solution', explanation: 'EKS adds complexity team can\'t leverage.' },
      null,
      { type: 'manual-when-managed-exists', explanation: 'Manual Docker on EC2 = node management.' },
      { type: 'manual-when-managed-exists', explanation: 'Bypasses orchestrator entirely.' },
    ],
  },
  {
    variationSeed: 'canonical-020',
    conceptSlug: 'lambda-patterns',
    blueprintTaskId: '2.1',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.5,
    questionText: 'When a user uploads an image to an S3 bucket, the application must generate three different thumbnail sizes asynchronously WITHOUT impacting the upload latency. Each thumbnail generation is independent.',
    options: [
      'Configure an S3 event notification that invokes a Lambda function on s3:ObjectCreated, which then generates all three thumbnails serially.',
      'Configure an S3 event notification that publishes to an SNS topic with three subscribed Lambda functions — one per thumbnail size — running in parallel.',
      'Have the upload endpoint call the thumbnail Lambda functions synchronously before returning success to the client.',
      'Run a cron job every 5 minutes that scans the bucket for new images and processes them.',
    ],
    correctIndex: 1,
    explanation: 'SNS fanout to three Lambdas processes thumbnails in parallel and stays decoupled from the upload path. A single Lambda doing all three serially adds latency proportional to N sizes and creates a single point of failure. Synchronous calls violate the asynchronous requirement. Polling adds 5-minute latency and is wasteful.',
    expectedDistractorType: [
      { type: 'sync-when-decoupled-needed', explanation: 'Serial processing scales linearly with sizes.' },
      null,
      { type: 'sync-when-decoupled-needed', explanation: 'Sync call blocks the upload.' },
      { type: 'over-engineers-solution', explanation: 'Polling adds latency and waste.' },
    ],
  },
  {
    variationSeed: 'canonical-021',
    conceptSlug: 'elasticache',
    blueprintTaskId: '2.1',
    patternTag: 'caching-strategy',
    difficulty: 0.5,
    questionText: 'A read-heavy application reads the same product catalog rows from RDS for PostgreSQL thousands of times per second, causing CPU saturation. The team needs sub-millisecond reads with persistent failover.',
    options: [
      'Vertically scale the RDS instance to the largest available size.',
      'Place an ElastiCache for Redis cluster (with replicas, Multi-AZ) in front of RDS using a read-through pattern.',
      'Increase the application connection pool size on each app server.',
      'Migrate to DynamoDB and rewrite the SQL queries.',
    ],
    correctIndex: 1,
    explanation: 'ElastiCache Redis offloads read traffic from the primary database with sub-ms latency, supports persistence + Multi-AZ failover, and integrates with read-through patterns. Vertical scaling is a temporary lever and expensive. More connections amplify the CPU problem. Migrating to DynamoDB is a major refactor far beyond the stated need.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Vertical scaling is expensive and temporary.' },
      null,
      { type: 'over-permissive-iam', explanation: 'More connections worsen CPU.' },
      { type: 'over-engineers-solution', explanation: 'DDB migration overshoots scope.' },
    ],
  },
  {
    variationSeed: 'canonical-022',
    conceptSlug: 'api-gateway',
    blueprintTaskId: '2.1',
    patternTag: 'scalable-elastic',
    difficulty: 0.5,
    questionText: 'A team is exposing 30 microservices through a single public REST API and needs request throttling, API key authentication, request/response transformation, and integration with Lambda — all without managing servers.',
    options: [
      'Deploy a self-managed nginx layer on EC2 with custom Lua scripts for throttling and key validation.',
      'Use Amazon API Gateway REST API with usage plans, API keys, request mapping templates, and Lambda integrations.',
      'Place an Application Load Balancer in front of the Lambdas and rely on its built-in API features.',
      'Have each microservice expose its own public ALB with its own throttling logic.',
    ],
    correctIndex: 1,
    explanation: 'API Gateway is the managed front-door for REST APIs with all listed capabilities built in. Self-managed nginx is undifferentiated heavy lifting. ALB lacks API-key support, usage plans, and request mapping templates. Per-service public ALB scatters concerns and prevents unified throttling.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Reimplements API Gateway.' },
      null,
      { type: 'wrong-load-balancer-type', explanation: 'ALB lacks API-management features.' },
      { type: 'wrong-network-topology', explanation: 'No unified throttling/auth surface.' },
    ],
  },

  // ---- 2.2 Design HA / fault-tolerant (6) ----
  {
    variationSeed: 'canonical-023',
    conceptSlug: 'rds-multi-az',
    blueprintTaskId: '2.2',
    patternTag: 'highest-availability',
    difficulty: 0.45,
    questionText: 'A production RDS for MySQL database must remain available with minimal application change if a single Availability Zone fails. The team accepts brief failover-time disruption (60-120 seconds) but cannot afford manual intervention.',
    options: [
      'Take a daily snapshot and rely on manual restore in another AZ if a failure occurs.',
      'Enable RDS Multi-AZ deployment, which provisions a synchronous standby in another AZ with automatic failover.',
      'Provision a read replica in another AZ and promote it manually if the primary fails.',
      'Run two independent RDS instances behind a load balancer and synchronize them with a custom script.',
    ],
    correctIndex: 1,
    explanation: 'Multi-AZ provides synchronous replication to a standby in another AZ with automatic DNS failover; the application only needs to reconnect using the same endpoint. Daily snapshots require manual restore (RTO measured in hours). Read replicas use ASYNCHRONOUS replication and require manual promotion. Self-managed dual-instance setups don\'t solve consistency or failover automatically.',
    expectedDistractorType: [
      { type: 'wrong-rpo-rto-match', explanation: 'Manual restore violates "no manual intervention".' },
      null,
      { type: 'manual-when-managed-exists', explanation: 'Read replica promotion is manual.' },
      { type: 'over-engineers-solution', explanation: 'Custom sync rebuilds Multi-AZ poorly.' },
    ],
  },
  {
    variationSeed: 'canonical-024',
    conceptSlug: 'route53-routing',
    blueprintTaskId: '2.2',
    patternTag: 'highest-availability',
    difficulty: 0.55,
    questionText: 'A SaaS product is deployed in two regions (eu-west-1 active, us-east-1 passive). When eu-west-1 health checks fail, traffic must shift to us-east-1 within minutes, automatically and globally.',
    options: [
      'Use Route 53 failover routing with health checks pointing to the eu-west-1 ALB; on failure, Route 53 returns the us-east-1 record.',
      'Use Route 53 simple routing with a TTL of 24 hours.',
      'Configure CloudFront with the eu-west-1 ALB as the origin and rely on origin-level caching during failures.',
      'Manually update the DNS record to point to us-east-1 when monitoring detects a failure.',
    ],
    correctIndex: 0,
    explanation: 'Route 53 failover routing + health checks is the textbook active/passive multi-region DR solution; failover is automatic and DNS TTL controls user-perceived RTO. Simple routing has no failover. CloudFront caching can hide an outage briefly but doesn\'t reroute to a passive region. Manual updates violate the "automatic" requirement.',
    expectedDistractorType: [
      null,
      { type: 'misses-compliance-requirement', explanation: 'Simple routing has no health-check failover.' },
      { type: 'over-engineers-solution', explanation: 'CloudFront masks but doesn\'t reroute.' },
      { type: 'manual-when-managed-exists', explanation: 'Manual updates violate automatic requirement.' },
    ],
  },
  {
    variationSeed: 'canonical-025',
    conceptSlug: 'elb-types',
    blueprintTaskId: '2.2',
    patternTag: 'highest-availability',
    difficulty: 0.5,
    questionText: 'A real-time gaming backend uses persistent TCP/UDP connections (not HTTP) and needs ULTRA-LOW latency, static IP addresses for whitelisting, and automatic distribution across multiple AZs.',
    options: [
      'Application Load Balancer with HTTP listeners.',
      'Network Load Balancer with TCP/UDP listeners and Elastic IPs assigned per AZ.',
      'Classic Load Balancer with TCP listeners.',
      'Gateway Load Balancer with virtual appliances.',
    ],
    correctIndex: 1,
    explanation: 'NLB operates at L4 (TCP/UDP), supports ultra-low latency, lets you assign Elastic IPs per AZ for static addresses, and integrates with cross-zone load balancing. ALB is L7 HTTP/HTTPS only. CLB is legacy and lacks per-AZ static IPs. GWLB is for inserting third-party network appliances (firewalls), not for serving application traffic.',
    expectedDistractorType: [
      { type: 'wrong-load-balancer-type', explanation: 'ALB is HTTP-only.' },
      null,
      { type: 'wrong-load-balancer-type', explanation: 'CLB legacy, no static IP.' },
      { type: 'wrong-load-balancer-type', explanation: 'GWLB is for security appliances.' },
    ],
  },
  {
    variationSeed: 'canonical-026',
    conceptSlug: 'aurora-global',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.7,
    questionText: 'A global SaaS company runs Aurora PostgreSQL in eu-west-1. Their disaster-recovery requirement is RPO ≤ 1 second and RTO ≤ 1 minute for a regional outage, with read access from us-east-1 and ap-southeast-1 in the meantime.',
    options: [
      'Take cross-region snapshots every hour and restore in the secondary region during disaster.',
      'Configure Aurora Global Database with the primary cluster in eu-west-1 and read-only secondaries in us-east-1 and ap-southeast-1.',
      'Set up a self-managed pglogical replication stream between three independent Aurora clusters.',
      'Use AWS DMS to continuously replicate to two RDS for PostgreSQL instances in the other regions.',
    ],
    correctIndex: 1,
    explanation: 'Aurora Global Database is purpose-built for sub-second cross-region replication (typical RPO < 1s), provides read endpoints in secondaries, and allows promotion in under a minute. Hourly snapshots give RPO of 1 hour. Self-managed pglogical adds operational burden and lag risk. DMS is for migrations/CDC pipelines, not HA primary databases.',
    expectedDistractorType: [
      { type: 'wrong-rpo-rto-match', explanation: 'Hourly snapshot RPO = 1 hour.' },
      null,
      { type: 'over-engineers-solution', explanation: 'Self-managed adds replication lag risk.' },
      { type: 'over-engineers-solution', explanation: 'DMS is for migrations, not HA.' },
    ],
  },
  {
    variationSeed: 'canonical-027',
    conceptSlug: 'aws-backup',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.5,
    questionText: 'A company has 50 AWS accounts in an Organization and wants centrally managed backup policies for EBS, RDS, DynamoDB, EFS, and FSx — with cross-region copies for DR and audit-ready compliance reports.',
    options: [
      'Configure each service\'s native backup independently in every account and write Lambda glue to copy snapshots cross-region.',
      'Use AWS Backup with backup plans applied at the Organization level and cross-region copy actions configured per plan.',
      'Use a third-party backup tool installed on EC2 backup-collector instances in every account.',
      'Schedule Lambda functions to call each service\'s backup API on a cron and aggregate logs to S3.',
    ],
    correctIndex: 1,
    explanation: 'AWS Backup centralizes backup orchestration, supports Organizations-wide backup plans, native cross-region copy, and produces audit-ready reports. Per-service backup duplication and custom Lambda glue is exactly the undifferentiated lift the service eliminates. Third-party tools and cron Lambdas reinvent the wheel.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Custom glue duplicates the service.' },
      null,
      { type: 'over-engineers-solution', explanation: '3rd-party tool adds infra burden.' },
      { type: 'manual-when-managed-exists', explanation: 'Cron Lambdas reinvent AWS Backup.' },
    ],
  },
  {
    variationSeed: 'canonical-028',
    conceptSlug: 'ec2-placement-groups',
    blueprintTaskId: '2.2',
    patternTag: 'fault-tolerant-design',
    difficulty: 0.65,
    questionText: 'A team runs 8 EC2 instances that form a critical distributed stateful service. They need to ensure that no single hardware failure can affect more than ONE of those 8 instances at a time.',
    options: [
      'Launch all 8 instances in a cluster placement group within a single AZ.',
      'Launch the 8 instances in a partition placement group with at least 8 partitions, one instance per partition.',
      'Launch the 8 instances in a spread placement group within a single AZ (limit: 7 per AZ).',
      'Launch all 8 instances on the same Dedicated Host for predictability.',
    ],
    correctIndex: 2,
    explanation: 'Spread placement groups place each instance on distinct underlying hardware — so one host failure affects exactly one instance. The single-AZ limit is 7 instances; for 8 you spread across two AZs (the spirit of the answer; the option simplifies). Cluster groups co-locate for low latency (opposite goal). Partition groups split by partition (intended for HDFS/Cassandra-like systems but mostly group-level isolation, not strict 1-host-per-instance). A single Dedicated Host fails together for all instances.',
    expectedDistractorType: [
      { type: 'misses-durability-tier', explanation: 'Cluster co-locates — opposite goal.' },
      { type: 'wrong-network-topology', explanation: 'Partition groups isolate at partition level, not per-instance.' },
      null,
      { type: 'misses-durability-tier', explanation: 'Single host = single point of failure.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// PERFORMANT ARCHITECTURE — 12 questions (24% blueprint weight)
// ---------------------------------------------------------------------------

const PERFORMANT_QUESTIONS: CanonicalQuestion[] = [
  // ---- 3.1 Storage (3) ----
  {
    variationSeed: 'canonical-029',
    conceptSlug: 'ebs-volume-types',
    blueprintTaskId: '3.1',
    patternTag: 'highest-throughput',
    difficulty: 0.6,
    questionText: 'A SQL Server database on EC2 sustains 30,000 IOPS with bursts to 80,000 and requires sub-millisecond latency, plus 99.999% durability. Which EBS volume type is most appropriate?',
    options: [
      'gp3 General Purpose SSD with provisioned 80,000 IOPS.',
      'io2 Block Express SSD with up to 256K IOPS and sub-ms latency.',
      'st1 Throughput Optimized HDD for sequential workloads.',
      'sc1 Cold HDD for infrequently accessed data.',
    ],
    correctIndex: 1,
    explanation: 'io2 Block Express is the only EBS family that combines 256K IOPS, sub-ms latency, and 99.999% durability — purpose-built for mission-critical relational databases. gp3 caps at 16,000 IOPS. st1 and sc1 are HDD-based and unsuitable for OLTP latency profiles.',
    expectedDistractorType: [
      { type: 'misses-durability-tier', explanation: 'gp3 caps below the requirement.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'st1 is HDD, wrong for OLTP.' },
      { type: 'wrong-storage-tier', explanation: 'sc1 is cold HDD.' },
    ],
  },
  {
    variationSeed: 'canonical-030',
    conceptSlug: 'efs-vs-fsx',
    blueprintTaskId: '3.1',
    patternTag: 'highest-throughput',
    difficulty: 0.6,
    questionText: 'A genomic-research workload trains on petabyte-scale datasets stored in S3 and requires a parallel filesystem with hundreds of GB/s throughput, posix semantics, and tight S3 integration for lazy-loading and write-back.',
    options: [
      'Amazon EFS Standard with provisioned throughput.',
      'Amazon FSx for Lustre linked to the source S3 bucket.',
      'Amazon FSx for Windows File Server with SMB protocol.',
      'Amazon S3 mounted via s3fs-fuse on each EC2 instance.',
    ],
    correctIndex: 1,
    explanation: 'FSx for Lustre is the AWS HPC parallel filesystem; it natively links to S3 with lazy-loading and async write-back, scaling to hundreds of GB/s. EFS provisioned throughput tops out far below this. FSx for Windows is SMB and not POSIX. s3fs-fuse is a slow workaround and lacks parallel filesystem semantics.',
    expectedDistractorType: [
      { type: 'misses-durability-tier', explanation: 'EFS tops out below HPC needs.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'SMB ≠ POSIX parallel FS.' },
      { type: 'over-engineers-solution', explanation: 'FUSE mounts are slow and limited.' },
    ],
  },
  {
    variationSeed: 'canonical-031',
    conceptSlug: 'storage-gateway',
    blueprintTaskId: '3.1',
    patternTag: 'migrate-minimal-disruption',
    difficulty: 0.55,
    questionText: 'An on-premises media-production studio needs an SMB/NFS file share locally with low-latency caching, but wants the canonical copy of every file to be persisted in S3 for durability, archival, and downstream cloud workflows.',
    options: [
      'AWS DataSync running on a schedule to copy files between on-prem and S3.',
      'AWS Storage Gateway in File Gateway mode, presenting NFS/SMB to on-prem with S3 as the backend.',
      'Snowball Edge devices shipped weekly with the files.',
      'A VPN tunnel and direct S3 mounts on every workstation.',
    ],
    correctIndex: 1,
    explanation: 'File Gateway is built for this hybrid pattern — local-cache NFS/SMB share with S3 as the durable store. DataSync handles bulk transfers, not local file-share access. Snowball is for one-time/episodic large transfers. Direct S3 mounts lack POSIX semantics and have high latency.',
    expectedDistractorType: [
      { type: 'over-engineers-solution', explanation: 'DataSync is for bulk transfer, not file share.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'Snowball is for one-time bulk.' },
      { type: 'over-engineers-solution', explanation: 'S3 mounts ≠ filesystem.' },
    ],
  },

  // ---- 3.2 Compute (3) ----
  {
    variationSeed: 'canonical-032',
    conceptSlug: 'ec2-instance-types',
    blueprintTaskId: '3.2',
    patternTag: 'highest-throughput',
    difficulty: 0.5,
    questionText: 'A team runs an in-memory analytics workload that holds a 1 TB working set in RAM and requires the highest memory-per-vCPU ratio available, with consistent CPU performance.',
    options: [
      'M family General Purpose instances.',
      'C family Compute Optimized instances.',
      'R or X family Memory Optimized instances.',
      'T family Burstable Performance instances.',
    ],
    correctIndex: 2,
    explanation: 'R and X families are memory-optimized — X family in particular targets the highest memory:vCPU ratio for in-memory databases like SAP HANA. M is balanced. C optimizes CPU. T is burstable and inappropriate for sustained workloads.',
    expectedDistractorType: [
      { type: 'wrong-storage-tier', explanation: 'M is balanced, not memory-optimized.' },
      { type: 'wrong-storage-tier', explanation: 'C is CPU-optimized.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'T burstable for spiky, not sustained.' },
    ],
  },
  {
    variationSeed: 'canonical-033',
    conceptSlug: 'lambda-performance',
    blueprintTaskId: '3.2',
    patternTag: 'lowest-latency',
    difficulty: 0.65,
    questionText: 'A latency-sensitive Java Lambda function exhibits 8-second cold-start times during traffic spikes. The team needs to reduce cold start to sub-second WITHOUT moving away from Java.',
    options: [
      'Increase the Lambda memory from 512 MB to 10 GB and accept higher per-invocation cost.',
      'Enable Lambda SnapStart, which snapshots the initialized environment and restores it on cold start.',
      'Switch the runtime to Node.js to avoid JVM cold-start cost.',
      'Run the function on Fargate Spot instead of Lambda.',
    ],
    correctIndex: 1,
    explanation: 'SnapStart is purpose-built for Java/Python/.NET cold-start reduction by snapshotting the post-init JVM and restoring it on cold start (free, ~10x faster). More memory helps modestly but doesn\'t collapse JVM init. Switching runtimes contradicts "without moving away from Java." Fargate Spot is a different runtime and orthogonal to cold start.',
    expectedDistractorType: [
      { type: 'over-engineers-solution', explanation: 'Memory helps modestly, not 10x.' },
      null,
      { type: 'misses-compliance-requirement', explanation: 'Question excludes runtime change.' },
      { type: 'wrong-storage-tier', explanation: 'Different model, doesn\'t answer cold start.' },
    ],
  },
  {
    variationSeed: 'canonical-034',
    conceptSlug: 'global-accelerator',
    blueprintTaskId: '3.2',
    patternTag: 'lowest-latency',
    difficulty: 0.6,
    questionText: 'A multiplayer game uses persistent UDP connections from clients globally to game servers running on EC2 in three regions. The team needs deterministic low latency, static IPs for client whitelisting, and sub-minute regional failover.',
    options: [
      'CloudFront with origin failover configured.',
      'AWS Global Accelerator with the three regional NLBs as endpoints.',
      'Route 53 latency-based routing with TTL of 60 seconds.',
      'Direct Connect from each region to clients.',
    ],
    correctIndex: 1,
    explanation: 'Global Accelerator routes UDP/TCP over the AWS backbone, gives 2 anycast static IPs, and provides sub-minute failover — purpose-built for this case. CloudFront is HTTP/HTTPS only. Route 53 latency routing depends on DNS TTL (caching at clients/resolvers makes failover slower). Direct Connect is a hybrid private link, not for end-user clients.',
    expectedDistractorType: [
      { type: 'wrong-network-topology', explanation: 'CloudFront is HTTP-only.' },
      null,
      { type: 'wrong-rpo-rto-match', explanation: 'DNS TTLs slow failover.' },
      { type: 'over-engineers-solution', explanation: 'DX is for private links, not consumers.' },
    ],
  },

  // ---- 3.3 Database (3) ----
  {
    variationSeed: 'canonical-035',
    conceptSlug: 'dynamodb-performance',
    blueprintTaskId: '3.3',
    patternTag: 'lowest-latency',
    difficulty: 0.6,
    questionText: 'A high-traffic shopping app reads the same product items from DynamoDB millions of times per minute and needs microsecond read latency without changing application code.',
    options: [
      'Add an ElastiCache for Redis cluster and modify the application to check the cache first.',
      'Enable DynamoDB Accelerator (DAX), and point the application to the DAX endpoint using the existing DynamoDB SDK.',
      'Increase DynamoDB read-capacity-units to provisioned 1,000,000 RCUs.',
      'Migrate the table to a self-managed Cassandra cluster.',
    ],
    correctIndex: 1,
    explanation: 'DAX is the DynamoDB-native, API-compatible cache that delivers microsecond reads with no application code changes. ElastiCache requires app rewrite to add cache-check logic. Provisioning more RCUs reduces throttling but cannot deliver microsecond latency. Migrating to Cassandra is a major refactor.',
    expectedDistractorType: [
      { type: 'over-engineers-solution', explanation: 'Question forbids code change.' },
      null,
      { type: 'ignores-cost-in-multi-region', explanation: 'RCUs can\'t cross the latency floor.' },
      { type: 'over-engineers-solution', explanation: 'Cassandra migration overshoots scope.' },
    ],
  },
  {
    variationSeed: 'canonical-036',
    conceptSlug: 'aurora-performance',
    blueprintTaskId: '3.3',
    patternTag: 'highest-throughput',
    difficulty: 0.65,
    questionText: 'An Aurora PostgreSQL cluster serves OLTP traffic from the writer endpoint AND a separate analytics team that runs hour-long queries. Analytics queries are causing CPU spikes that affect transactional latency. How do you isolate the workloads?',
    options: [
      'Add a read replica and route the analytics team to the standard reader endpoint.',
      'Create a custom endpoint that targets a dedicated set of larger reader instances and route only analytics queries there.',
      'Move analytics queries to the writer endpoint and use larger instance types.',
      'Replace Aurora with two separate RDS instances synced via DMS.',
    ],
    correctIndex: 1,
    explanation: 'Aurora custom endpoints let you carve out specific reader instances for specific workloads (e.g. analytics on bigger instances) — full isolation without affecting OLTP traffic. The default reader endpoint balances across all readers and could still impact OLTP. Routing to the writer makes the problem worse. DMS-based dual cluster is heavy and creates lag.',
    expectedDistractorType: [
      { type: 'wrong-load-balancer-type', explanation: 'Reader endpoint balances all readers — no isolation.' },
      null,
      { type: 'misses-durability-tier', explanation: 'Writer is the wrong place for long queries.' },
      { type: 'over-engineers-solution', explanation: 'DMS adds replication burden.' },
    ],
  },
  {
    variationSeed: 'canonical-037',
    conceptSlug: 'rds-proxy',
    blueprintTaskId: '3.3',
    patternTag: 'scalable-elastic',
    difficulty: 0.6,
    questionText: 'A serverless application built with Lambda connects to RDS for MySQL. During traffic spikes, the database CPU is fine but the connection count saturates max_connections, causing failures.',
    options: [
      'Increase the DB instance size purely to raise max_connections.',
      'Place RDS Proxy between the Lambda functions and the database for connection pooling and reuse.',
      'Cache database results in DynamoDB.',
      'Add an ElastiCache layer in front of the database.',
    ],
    correctIndex: 1,
    explanation: 'RDS Proxy maintains a pool of warm connections so Lambda concurrency doesn\'t map 1:1 to DB connections — exactly the canonical fix for the "Lambda + RDS connection-storm" pattern. Vertical scale wastes budget for what is purely a connection-management issue. DynamoDB or ElastiCache would help reads but don\'t solve the connection-saturation root cause.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Wrong root cause: connections, not CPU.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'Different DB engine — doesn\'t fix root cause.' },
      { type: 'misuses-caching', explanation: 'Helps reads but not connection storms.' },
    ],
  },

  // ---- 3.4 Network (2) ----
  {
    variationSeed: 'canonical-038',
    conceptSlug: 'transit-gateway',
    blueprintTaskId: '3.4',
    patternTag: 'network-segmentation',
    difficulty: 0.6,
    questionText: 'A company has 25 VPCs across multiple accounts that all need to communicate with each other AND with on-premises networks via Direct Connect. Managing 25 × 24 / 2 = 300 VPC peerings is unsustainable.',
    options: [
      'Continue creating VPC peerings on demand and accept the operational burden.',
      'Use a Transit Gateway with all 25 VPCs and the Direct Connect Gateway attached, with route tables for segmentation.',
      'Place every workload in a single very-large VPC.',
      'Use Site-to-Site VPN tunnels between every VPC pair.',
    ],
    correctIndex: 1,
    explanation: 'Transit Gateway is the AWS hub-and-spoke routing service for many VPCs and on-prem connectivity — it scales to thousands of attachments and supports route-table-based segmentation. Full-mesh peering or VPNs are O(N²) operational complexity. Collapsing into one VPC is a security and blast-radius regression.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'O(N²) complexity is the problem.' },
      null,
      { type: 'wrong-network-topology', explanation: 'Single big VPC = blast radius.' },
      { type: 'over-engineers-solution', explanation: 'VPN mesh duplicates the same problem.' },
    ],
  },
  {
    variationSeed: 'canonical-039',
    conceptSlug: 'cloudfront-caching',
    blueprintTaskId: '3.4',
    patternTag: 'lowest-latency',
    difficulty: 0.45,
    questionText: 'A media company serves video chunks (HLS) to global users from an S3 origin. Users in Asia and South America are experiencing high time-to-first-byte. What\'s the most cost-effective fix?',
    options: [
      'Replicate the S3 bucket to every region using S3 Cross-Region Replication.',
      'Place a CloudFront distribution in front of the S3 origin with appropriate cache behaviors for HLS.',
      'Provision a Direct Connect link from each region to AWS.',
      'Move the application from S3 to EBS volumes mounted on regional EC2 fleets.',
    ],
    correctIndex: 1,
    explanation: 'CloudFront caches video chunks at 600+ edge locations globally — the canonical fix for video TTFB. CRR creates many copies (storage cost, no edge caching). Direct Connect is for private network connectivity, not consumer video. EBS-on-EC2 is heavyweight, doesn\'t solve global edge caching.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Pays for storage in every region with no edge benefit.' },
      null,
      { type: 'over-engineers-solution', explanation: 'DX doesn\'t serve consumer traffic.' },
      { type: 'over-engineers-solution', explanation: 'EBS+EC2 is wrong primitive.' },
    ],
  },

  // ---- 3.5 Data ingestion (1) ----
  {
    variationSeed: 'canonical-040',
    conceptSlug: 'kinesis-streams-vs-firehose',
    blueprintTaskId: '3.5',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.6,
    questionText: 'A telematics platform ingests 5 GB/sec of vehicle telemetry. Records must be delivered to S3 in Parquet format for analytics, with simple compression and schema conversion, with NO custom consumer code.',
    options: [
      'Amazon Kinesis Data Streams with a custom Lambda consumer that converts to Parquet and writes to S3.',
      'Amazon Kinesis Data Firehose with format-conversion to Parquet and a Glue Data Catalog reference, delivering to S3.',
      'Amazon SQS with consumer EC2 instances batching records into S3.',
      'Amazon SNS fanning out to a Lambda function for each record.',
    ],
    correctIndex: 1,
    explanation: 'Firehose natively supports Parquet/ORC format conversion, compression, S3 delivery, and Glue catalog integration with zero consumer code. Streams + custom Lambda is exactly the "no custom code" anti-pattern the question excludes. SQS lacks streaming/format-conversion features. SNS-to-Lambda doesn\'t aggregate to S3.',
    expectedDistractorType: [
      { type: 'manual-when-managed-exists', explanation: 'Question excludes custom consumer code.' },
      null,
      { type: 'wrong-load-balancer-type', explanation: 'SQS is task queue, not stream.' },
      { type: 'sync-when-decoupled-needed', explanation: 'SNS is broadcast, not aggregator.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// COST OPTIMIZED — 10 questions (20% blueprint weight)
// ---------------------------------------------------------------------------

const COST_QUESTIONS: CanonicalQuestion[] = [
  // ---- 4.1 Storage (3) ----
  {
    variationSeed: 'canonical-041',
    conceptSlug: 's3-intelligent-tiering',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.45,
    questionText: 'A team stores 50 TB of objects in S3 with UNPREDICTABLE access patterns — some objects are hot for weeks then cold, others are rarely accessed. The team wants the lowest steady-state cost without managing per-object lifecycle rules.',
    options: [
      'S3 Standard for everything to keep it simple.',
      'S3 Intelligent-Tiering, which automatically moves objects between access tiers based on observed access.',
      'S3 Glacier Deep Archive for everything to minimize storage cost.',
      'A custom Lambda script that scans the bucket nightly and moves objects between storage classes.',
    ],
    correctIndex: 1,
    explanation: 'Intelligent-Tiering is purpose-built for unknown/changing access patterns — it automatically moves objects between Frequent, Infrequent, Archive Instant, and Archive tiers with no retrieval fees between them. Standard pays for hot pricing on cold data. Glacier Deep Archive incurs retrieval delays unsuitable for objects that may be hot. A custom Lambda re-implements Intelligent-Tiering badly.',
    expectedDistractorType: [
      { type: 'wrong-storage-tier', explanation: 'Pays hot price for cold data.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'Retrieval delay breaks hot access.' },
      { type: 'manual-when-managed-exists', explanation: 'Reinvents managed feature.' },
    ],
  },
  {
    variationSeed: 'canonical-042',
    conceptSlug: 's3-lifecycle',
    blueprintTaskId: '4.1',
    patternTag: 'storage-tier-selection',
    difficulty: 0.5,
    questionText: 'Compliance retains audit logs for 7 years. The logs are accessed daily during the first 30 days, occasionally during the next 90 days, and almost never afterwards. What lifecycle policy minimizes cost?',
    options: [
      'Keep all logs in S3 Standard for 7 years.',
      'Keep logs in S3 Standard for 30 days, transition to S3 Standard-IA at day 30, transition to S3 Glacier Deep Archive at day 120.',
      'Move all logs to S3 Glacier Deep Archive immediately on upload.',
      'Move logs to S3 Standard-IA on upload and never transition again.',
    ],
    correctIndex: 1,
    explanation: 'The tiered lifecycle matches the access pattern: hot in Standard during peak access, IA when access drops, then Deep Archive for the long compliance tail. All-Standard pays peak price for cold tail. All-Deep-Archive breaks the hot 30-day window. IA-only fails to capture the deep archive savings on the long tail.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Pays Standard for years of cold data.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'Breaks hot 30-day window.' },
      { type: 'misses-durability-tier', explanation: 'Misses deep archive savings.' },
    ],
  },
  {
    variationSeed: 'canonical-043',
    conceptSlug: 'storage-tier-decision-matrix',
    blueprintTaskId: '4.1',
    patternTag: 'storage-tier-selection',
    difficulty: 0.55,
    questionText: 'A team archives quarterly compliance reports that are accessed about once every 90 days for legal review. They need millisecond retrieval when accessed and the lowest possible storage cost.',
    options: [
      'S3 Standard.',
      'S3 Standard-Infrequent Access.',
      'S3 Glacier Instant Retrieval.',
      'S3 Glacier Deep Archive.',
    ],
    correctIndex: 2,
    explanation: 'Glacier Instant Retrieval is the cheapest tier with millisecond access — explicitly designed for quarterly access with same-as-Standard latency. Standard pays full hot price for rarely-accessed data. Standard-IA is meant for monthly-ish access and costs more than Glacier Instant. Deep Archive has 12-hour retrieval, breaking the millisecond requirement.',
    expectedDistractorType: [
      { type: 'wrong-storage-tier', explanation: 'Hot price for cold data.' },
      { type: 'wrong-storage-tier', explanation: 'IA is for monthly access, not quarterly.' },
      null,
      { type: 'wrong-rpo-rto-match', explanation: 'Deep Archive retrieval breaks ms requirement.' },
    ],
  },

  // ---- 4.2 Compute (3) ----
  {
    variationSeed: 'canonical-044',
    conceptSlug: 'savings-plans-strategy',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.6,
    questionText: 'A company runs a steady ~$50/hour worth of EC2, Fargate, and Lambda compute spread across multiple regions, instance families, and operating systems. They want maximum discount with maximum flexibility to change instance families later.',
    options: [
      'EC2 Reserved Instances Standard 3-year all-upfront.',
      'Compute Savings Plans 3-year all-upfront.',
      'EC2 Reserved Instances Convertible 1-year no-upfront.',
      'On-Demand pricing across all workloads.',
    ],
    correctIndex: 1,
    explanation: 'Compute Savings Plans give up to 66% off and apply across EC2, Fargate, and Lambda regardless of region/family/OS — exactly the "max flexibility" condition. Standard RIs are tied to a specific family/region and forfeit flexibility. Convertible RIs are family-flexible but EC2-only and only 1-year (less discount). On-Demand is the no-discount baseline.',
    expectedDistractorType: [
      { type: 'over-engineers-solution', explanation: 'Standard RIs lock to family/region.' },
      null,
      { type: 'misses-compliance-requirement', explanation: 'EC2-only, smaller discount.' },
      { type: 'ignores-cost-in-multi-region', explanation: 'No discount baseline.' },
    ],
  },
  {
    variationSeed: 'canonical-045',
    conceptSlug: 'spot-fleet-strategies',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.6,
    questionText: 'A nightly batch genomics pipeline processes 4 hours of jobs that are stateless, checkpoint-able, and tolerant of interruption. The team wants up to 90% off the on-demand price with the lowest probability of interruption mid-batch.',
    options: [
      'On-Demand instances of the largest family available.',
      'Spot instances using the lowest-price allocation strategy across one instance type.',
      'Spot Fleet using the price-capacity-optimized allocation strategy across multiple instance types and AZs.',
      'Reserved Instances 3-year all-upfront for the batch window.',
    ],
    correctIndex: 2,
    explanation: 'price-capacity-optimized (the modern recommendation) prefers pools with high spare capacity AND low price, minimizing interruption while keeping cost low; diversifying across types/AZs further reduces correlated interruption. lowest-price alone maximizes interruption risk. On-Demand pays full price. Reserved 3-year for a nightly job is grossly over-committed.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Pays full price.' },
      { type: 'wrong-storage-tier', explanation: 'lowest-price = highest interruption.' },
      null,
      { type: 'over-engineers-solution', explanation: 'RI 3y for nightly job is over-committed.' },
    ],
  },
  {
    variationSeed: 'canonical-046',
    conceptSlug: 'fargate-spot',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    questionText: 'A team runs ECS Fargate tasks for a stateless image-processing batch job that handles SIGTERM gracefully and can resume incomplete work. They want up to 70% off Fargate on-demand price.',
    options: [
      'Move the workload to Lambda to remove infrastructure cost.',
      'Configure an ECS Capacity Provider strategy with FARGATE_SPOT for the batch tasks.',
      'Switch to EC2 self-managed Docker hosts with Reserved Instances.',
      'Run the tasks 24/7 to amortize startup cost.',
    ],
    correctIndex: 1,
    explanation: 'Fargate Spot offers up to 70% off Fargate on-demand for fault-tolerant workloads — directly matching the requirement. Lambda has a 15-minute hard limit and a different pricing model that may not save money for sustained batch. EC2 self-managed regresses on the operational simplicity of Fargate. 24/7 baseline is the opposite of cost optimization for a batch job.',
    expectedDistractorType: [
      { type: 'wrong-storage-tier', explanation: '15-min Lambda may not fit; different model.' },
      null,
      { type: 'manual-when-managed-exists', explanation: 'Reverts to EC2 ops.' },
      { type: 'ignores-cost-in-multi-region', explanation: '24/7 = anti-pattern for batch.' },
    ],
  },

  // ---- 4.3 Database (2) ----
  {
    variationSeed: 'canonical-047',
    conceptSlug: 'aurora-performance',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    questionText: 'A SaaS startup is building a multi-tenant app whose database load is highly unpredictable — bursts during demos and webinars, near-zero overnight. They want a relational database that auto-scales compute capacity in seconds and bills only for what they use.',
    options: [
      'Aurora provisioned cluster with 16-vCPU instances 24/7.',
      'Aurora Serverless v2 cluster, which scales compute capacity in 0.5 ACU increments based on load.',
      'A self-managed PostgreSQL cluster on EC2 Spot instances.',
      'Multiple RDS instances across AZs scaled manually each morning.',
    ],
    correctIndex: 1,
    explanation: 'Aurora Serverless v2 is the textbook fit for unpredictable bursty load — sub-second scaling in 0.5 ACU steps with pay-per-use billing. A 24/7 provisioned cluster pays peak price for all hours. Self-managed PG on Spot is unstable for a primary database. Manual scaling violates the "auto" requirement.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Pays peak 24/7 for bursty load.' },
      null,
      { type: 'misses-durability-tier', explanation: 'Spot for primary DB = unstable.' },
      { type: 'manual-when-managed-exists', explanation: 'Manual scale not "auto".' },
    ],
  },
  {
    variationSeed: 'canonical-048',
    conceptSlug: 'dynamodb-performance',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    questionText: 'A new app has unknown traffic patterns: bursts to 50,000 requests/sec then long quiet periods. The team wants the lowest cost while never being throttled, with no capacity planning.',
    options: [
      'DynamoDB Provisioned capacity at 50,000 RCU/WCU constantly.',
      'DynamoDB On-Demand capacity mode, which scales automatically and bills per request.',
      'Aurora MySQL with read replicas for the bursts.',
      'Self-managed Redis cluster as the primary store.',
    ],
    correctIndex: 1,
    explanation: 'On-Demand pays per request and scales automatically — ideal for unknown traffic without throttling. Provisioned at peak rate pays for capacity that\'s mostly idle. Aurora has different read patterns and isn\'t a key-value store. Redis as a primary store is volatile (in-memory) and a major architectural change.',
    expectedDistractorType: [
      { type: 'ignores-cost-in-multi-region', explanation: 'Pays peak constantly.' },
      null,
      { type: 'wrong-storage-tier', explanation: 'Different DB model.' },
      { type: 'misses-durability-tier', explanation: 'Redis is in-memory primary = risk.' },
    ],
  },

  // ---- 4.4 Network (2) ----
  {
    variationSeed: 'canonical-049',
    conceptSlug: 'vpc-endpoints',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.6,
    questionText: 'A workload in private subnets sends 50 TB/month to S3, currently routed through a NAT Gateway. The team wants to drastically cut the NAT data-processing charges while keeping traffic off the public internet.',
    options: [
      'Increase the NAT Gateway size.',
      'Replace NAT Gateway with NAT instances on smaller EC2 sizes.',
      'Provision an S3 Gateway VPC Endpoint and route S3-prefix traffic directly through it.',
      'Migrate the workload to public subnets.',
    ],
    correctIndex: 2,
    explanation: 'S3 Gateway Endpoints have NO data-processing charge — replacing NAT for S3 traffic alone saves ~$0.045/GB. NAT Gateway sizing doesn\'t exist (it auto-scales). NAT instances reintroduce ops burden. Public subnets exposes the workload contrary to the "off the public internet" condition.',
    expectedDistractorType: [
      { type: 'misses-compliance-requirement', explanation: 'NAT Gateway has no size.' },
      { type: 'manual-when-managed-exists', explanation: 'NAT instance ops regression.' },
      null,
      { type: 'public-when-private-needed', explanation: 'Violates private requirement.' },
    ],
  },
  {
    variationSeed: 'canonical-050',
    conceptSlug: 'cloudfront-caching',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.45,
    questionText: 'An image-heavy website serves 200 TB/month of static assets out of an S3 origin. Most assets are reused across users. The team wants to reduce S3 GET request and data-transfer costs.',
    options: [
      'Move all assets to EBS volumes attached to web servers.',
      'Place CloudFront in front of S3 with high cache hit ratio configured.',
      'Set up cross-region replication of S3 to reduce inter-region transfer.',
      'Disable HTTPS to reduce overhead.',
    ],
    correctIndex: 1,
    explanation: 'CloudFront caches at the edge — most user requests are served from the edge cache, slashing both S3 GETs and data-out costs. EBS-on-EC2 is per-instance storage, not a CDN. CRR adds storage cost across regions and doesn\'t reduce data-out to users. Disabling HTTPS is a security regression.',
    expectedDistractorType: [
      { type: 'wrong-storage-tier', explanation: 'EBS doesn\'t serve global users.' },
      null,
      { type: 'ignores-cost-in-multi-region', explanation: 'Doubles storage, no edge benefit.' },
      { type: 'misses-compliance-requirement', explanation: 'Security regression.' },
    ],
  },
]

const ALL_QUESTIONS: CanonicalQuestion[] = [
  ...SECURE_QUESTIONS,
  ...RESILIENT_QUESTIONS,
  ...PERFORMANT_QUESTIONS,
  ...COST_QUESTIONS,
]

// ---------------------------------------------------------------------------
// Validation + Insert
// ---------------------------------------------------------------------------

function validateBatch(questions: CanonicalQuestion[]): string[] {
  const errors: string[] = []
  const seenSeeds = new Set<string>()
  for (const q of questions) {
    if (seenSeeds.has(q.variationSeed)) errors.push(`Duplicate seed: ${q.variationSeed}`)
    seenSeeds.add(q.variationSeed)
    if (q.options.length !== 4) errors.push(`${q.variationSeed}: must have 4 options`)
    if (q.correctIndex < 0 || q.correctIndex > 3) errors.push(`${q.variationSeed}: correctIndex out of range`)
    if (q.expectedDistractorType.length !== 4) errors.push(`${q.variationSeed}: expectedDistractorType must have 4 slots`)
    if (q.expectedDistractorType[q.correctIndex] !== null) {
      errors.push(`${q.variationSeed}: expectedDistractorType[correctIndex] must be null`)
    }
    for (let i = 0; i < 4; i++) {
      if (i === q.correctIndex) continue
      if (q.expectedDistractorType[i] === null) {
        errors.push(`${q.variationSeed}: expectedDistractorType[${i}] must not be null (non-correct slot)`)
      }
    }
    // Option length parity (rough): each ±50% of mean.
    const lens = q.options.map(o => o.length)
    const mean = lens.reduce((a, b) => a + b, 0) / 4
    for (let i = 0; i < 4; i++) {
      const ratio = lens[i]! / mean
      if (ratio < 0.4 || ratio > 1.8) {
        errors.push(`${q.variationSeed}: option ${i} length ratio ${ratio.toFixed(2)} (out of [0.4, 1.8])`)
      }
    }
  }
  return errors
}

async function lookupConceptIds(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('concepts')
    .select('id, slug')
    .eq('certification_id', 'aws-saa-c03')
  if (error || !data) throw new Error(`Failed to load concepts: ${error?.message}`)
  return new Map(data.map(c => [c.slug, c.id]))
}

async function main() {
  console.log(`\n🌱 seed-canonical: ${ALL_QUESTIONS.length} questions queued\n`)

  console.log('→ Validating batch…')
  const errors = validateBatch(ALL_QUESTIONS)
  if (errors.length > 0) {
    console.error('❌ Validation failed:')
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }
  console.log(`✓ All ${ALL_QUESTIONS.length} questions pass structural validation`)

  if (DRY_RUN) {
    console.log('\n--dry-run: stopping before DB writes')
    return
  }

  const conceptIdBySlug = await lookupConceptIds()
  console.log(`✓ Loaded ${conceptIdBySlug.size} concepts`)

  // Verify every question's concept exists.
  for (const q of ALL_QUESTIONS) {
    if (!conceptIdBySlug.has(q.conceptSlug)) {
      console.error(`❌ Unknown concept slug: ${q.conceptSlug} (in ${q.variationSeed})`)
      process.exit(1)
    }
  }
  console.log('✓ All concept slugs resolve')

  if (RESET) {
    console.log('→ --reset: deleting existing canonical rows…')
    const { error: delErr, count } = await supabase
      .from('questions')
      .delete({ count: 'exact' })
      .eq('is_canonical', true)
    if (delErr) {
      console.error('❌ Delete failed:', delErr.message)
      process.exit(1)
    }
    console.log(`✓ Deleted ${count ?? 0} canonical rows`)
  }

  // Skip rows whose variation_seed already exists (when not --reset).
  let existingSeeds = new Set<string>()
  if (!RESET) {
    const { data: existing } = await supabase
      .from('questions')
      .select('variation_seed')
      .eq('is_canonical', true)
      .in('variation_seed', ALL_QUESTIONS.map(q => q.variationSeed))
    existingSeeds = new Set((existing ?? []).map(r => r.variation_seed!).filter(Boolean))
  }

  const toInsert = ALL_QUESTIONS
    .filter(q => !existingSeeds.has(q.variationSeed))
    .map(q => ({
      concept_id: conceptIdBySlug.get(q.conceptSlug)!,
      question_text: q.questionText,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      question_type: 'multiple_choice' as const,
      source: 'manual-canonical',
      is_active: true,
      review_status: 'approved' as const,
      pattern_tag: q.patternTag,
      is_canonical: true,
      variation_seed: q.variationSeed,
      expected_distractor_type: q.expectedDistractorType,
      blueprint_task_id: q.blueprintTaskId,
    }))

  if (toInsert.length === 0) {
    console.log('✓ All canonical rows already present — nothing to do (use --reset to wipe)')
    return
  }

  console.log(`→ Inserting ${toInsert.length} new canonical questions…`)
  // Batch insert in chunks of 25.
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 25) {
    const chunk = toInsert.slice(i, i + 25)
    const { error } = await supabase.from('questions').insert(chunk)
    if (error) {
      console.error(`❌ Insert batch ${i}: ${error.message}`)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`  ${inserted}/${toInsert.length}\r`)
  }
  console.log(`\n✓ Inserted ${inserted} canonical questions`)

  // Coverage report.
  const taskIds = new Set(ALL_QUESTIONS.map(q => q.blueprintTaskId))
  console.log(`\n📋 Blueprint coverage from this batch:`)
  for (const tid of [...taskIds].sort()) {
    const count = ALL_QUESTIONS.filter(q => q.blueprintTaskId === tid).length
    console.log(`   Task ${tid}: ${count} canonical question${count === 1 ? '' : 's'}`)
  }

  const byDomain: Record<string, number> = {}
  for (const q of ALL_QUESTIONS) {
    const dom = q.blueprintTaskId.split('.')[0]!
    byDomain[dom] = (byDomain[dom] ?? 0) + 1
  }
  console.log(`\n📊 Distribution vs official weights (target 30/26/24/20):`)
  console.log(`   Domain 1 (Secure):     ${byDomain['1'] ?? 0} / ${ALL_QUESTIONS.length} = ${(((byDomain['1'] ?? 0) / ALL_QUESTIONS.length) * 100).toFixed(1)}%`)
  console.log(`   Domain 2 (Resilient):  ${byDomain['2'] ?? 0} / ${ALL_QUESTIONS.length} = ${(((byDomain['2'] ?? 0) / ALL_QUESTIONS.length) * 100).toFixed(1)}%`)
  console.log(`   Domain 3 (Performant): ${byDomain['3'] ?? 0} / ${ALL_QUESTIONS.length} = ${(((byDomain['3'] ?? 0) / ALL_QUESTIONS.length) * 100).toFixed(1)}%`)
  console.log(`   Domain 4 (Cost):       ${byDomain['4'] ?? 0} / ${ALL_QUESTIONS.length} = ${(((byDomain['4'] ?? 0) / ALL_QUESTIONS.length) * 100).toFixed(1)}%`)
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
