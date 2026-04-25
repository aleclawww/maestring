// Combinatorial question templates.
//
// A template is a parameterised question shape: a stem with `{{slot}}`
// placeholders, an options matrix, and a slot dictionary. Expanding a
// template produces N variants — one per cartesian product of slot values,
// optionally pruned by a `filter` predicate.
//
// This is the **free tier** of question generation: no LLM calls, fully
// deterministic, idempotent. Each variant gets a stable variation_seed
// derived from `${id}:${slotHash}`, so re-running seed scripts produces
// the same rows and dedupe works on the DB unique-by-seed guarantee.
//
// Templates target one blueprint_task_id and one pattern_tag. The seeder
// script (`scripts/seed-from-templates.ts`) walks this list, expands each,
// runs structural validation, and inserts with `is_canonical=false` and
// `source='templated'` so the selector can prefer the canonical spine
// when both are eligible.
//
// Why we hand-write templates instead of asking an LLM:
//   - Zero token spend → can re-generate at will
//   - Deterministic output → reproducible benchmarks
//   - Pedagogically curated distractors → digital-twin distractor_pattern
//     dimension stays interpretable
//   - We control the slot taxonomy (regions, RPO/RTO buckets, instance
//     families, etc.) so combinations remain realistic

import { createHash } from 'node:crypto'

// Distractor and pattern taxonomies are duplicated from seed-canonical.ts
// rather than imported to keep this module independent of the script layer.
// Migration 036 documents the canonical set; keep these unions in sync.

export type DistractorType =
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

export type PatternTag =
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

export interface TemplateOption {
  // Option text. May contain {{slot}} placeholders resolved at expansion time.
  text: string
  // Whether this option is the correct answer. Exactly one option per
  // template must have correct=true (validated at expansion).
  correct: boolean
  // For incorrect options: the wrong-reasoning label that drives the
  // digital-twin distractor_pattern fingerprint.
  distractor?: { type: DistractorType; explanation: string }
}

export interface Template {
  id: string                                  // 'tpl-001' — stable
  conceptSlug: string                         // must match aws-saa.ts CONCEPTS
  blueprintTaskId: string                     // '1.1' .. '4.4'
  patternTag: PatternTag
  difficulty: number                          // [0,1]
  // Slot dictionary. Keys referenced as {{key}} in stem/options/explanation.
  // Each slot lists the discrete values the template iterates over.
  slots: Record<string, string[]>
  stem: string
  options: TemplateOption[]                   // exactly 4
  explanation: string
  // Optional cartesian-product pruner. Receives one resolved slot map and
  // returns false to skip that combination (e.g., disallow eu-west-1 +
  // us-only-service combinations).
  filter?: (resolved: Record<string, string>) => boolean
  // Cap on emitted variants per template (after filter). Defaults to 12 to
  // avoid a single template flooding the pool.
  maxVariants?: number
}

export interface ExpandedQuestion {
  variationSeed: string
  templateId: string
  conceptSlug: string
  blueprintTaskId: string
  patternTag: PatternTag
  difficulty: number
  questionText: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  expectedDistractorType: ({ type: DistractorType; explanation: string } | null)[]
}

// ──────────────────────────────────────────────────────────────────────────
// Expansion engine
// ──────────────────────────────────────────────────────────────────────────

function substitute(text: string, slots: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match: string, k: string): string => {
    const v = slots[k]
    if (v === undefined) throw new Error(`Unknown slot {{${k}}} in template text`)
    return v
  })
}

function cartesian(slotEntries: [string, string[]][]): Record<string, string>[] {
  if (slotEntries.length === 0) return [{}]
  const head = slotEntries[0]!
  const rest = slotEntries.slice(1)
  const [key, values] = head
  const tail = cartesian(rest)
  return values.flatMap((v: string) => tail.map(t => ({ [key]: v, ...t })))
}

function slotHash(resolved: Record<string, string>): string {
  const ordered = Object.keys(resolved).sort().map(k => `${k}=${resolved[k]}`).join('|')
  return createHash('sha1').update(ordered).digest('hex').slice(0, 10)
}

export function expandTemplate(t: Template): ExpandedQuestion[] {
  const correctCount = t.options.filter(o => o.correct).length
  if (correctCount !== 1) {
    throw new Error(`Template ${t.id}: expected exactly 1 correct option, got ${correctCount}`)
  }
  if (t.options.length !== 4) {
    throw new Error(`Template ${t.id}: expected 4 options, got ${t.options.length}`)
  }
  for (const o of t.options) {
    if (!o.correct && !o.distractor) {
      throw new Error(`Template ${t.id}: incorrect option missing distractor metadata`)
    }
  }

  const slotEntries = Object.entries(t.slots)
  const combos = cartesian(slotEntries).filter(c => (t.filter ? t.filter(c) : true))
  const cap = t.maxVariants ?? 12
  const limited = combos.slice(0, cap)

  return limited.map(resolved => {
    const correctIndex = t.options.findIndex(o => o.correct) as 0 | 1 | 2 | 3
    const opts = t.options.map(o => substitute(o.text, resolved)) as [string, string, string, string]
    const distractors = t.options.map(o =>
      o.correct
        ? null
        : { type: o.distractor!.type, explanation: substitute(o.distractor!.explanation, resolved) },
    )
    return {
      variationSeed: `${t.id}:${slotHash(resolved)}`,
      templateId: t.id,
      conceptSlug: t.conceptSlug,
      blueprintTaskId: t.blueprintTaskId,
      patternTag: t.patternTag,
      difficulty: t.difficulty,
      questionText: substitute(t.stem, resolved),
      options: opts,
      correctIndex,
      explanation: substitute(t.explanation, resolved),
      expectedDistractorType: distractors,
    }
  })
}

export function expandAll(templates: Template[]): ExpandedQuestion[] {
  const out: ExpandedQuestion[] = []
  const seen = new Set<string>()
  for (const t of templates) {
    for (const q of expandTemplate(t)) {
      if (seen.has(q.variationSeed)) {
        throw new Error(`Duplicate variation_seed ${q.variationSeed} (template ${t.id})`)
      }
      seen.add(q.variationSeed)
      out.push(q)
    }
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────────
// Templates
// ──────────────────────────────────────────────────────────────────────────
//
// Numbering convention:
//   tpl-1xx → Domain 1 (Secure)        targets 30%
//   tpl-2xx → Domain 2 (Resilient)     targets 26%
//   tpl-3xx → Domain 3 (Performant)    targets 24%
//   tpl-4xx → Domain 4 (Cost)          targets 20%
//
// Each block is sized to roughly preserve weight across the expanded pool.

export const TEMPLATES: Template[] = [
  // ───── Domain 1: Secure (1.1 — Identity & Access) ─────
  {
    id: 'tpl-101',
    conceptSlug: 'iam-roles-vs-policies',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.45,
    slots: {
      service: ['EC2 instance', 'Lambda function', 'ECS task'],
      target: ['an S3 bucket', 'a DynamoDB table', 'an SQS queue'],
    },
    stem: 'An {{service}} needs to read from {{target}} owned by the same account. What is the most secure and operationally correct way to grant access?',
    options: [
      { text: 'Create an IAM user, generate access keys, and embed them in the {{service}}.', correct: false, distractor: { type: 'iam-user-when-role-needed', explanation: 'Long-lived keys on compute are an anti-pattern; rotate via roles.' } },
      { text: 'Attach an IAM role to the {{service}} that grants least-privilege read access to {{target}}.', correct: true },
      { text: 'Make {{target}} publicly readable and rely on application-layer auth.', correct: false, distractor: { type: 'public-when-private-needed', explanation: 'Public exposure violates least privilege.' } },
      { text: 'Grant the {{service}} arn:aws:iam::aws:policy/AdministratorAccess and scope inside the app.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Admin breaks least privilege regardless of app-side checks.' } },
    ],
    explanation: 'IAM roles deliver short-lived credentials to {{service}} via the metadata service or task role; no long-lived secrets, automatic rotation, and least-privilege scoping at the AWS layer.',
  },

  {
    id: 'tpl-102',
    conceptSlug: 'iam-identity-center-sso',
    blueprintTaskId: '1.1',
    patternTag: 'identity-federation',
    difficulty: 0.55,
    slots: {
      idp: ['Okta', 'Azure AD', 'Google Workspace'],
      scope: ['multi-account access', 'console + CLI access', 'time-bound role assumption'],
    },
    stem: 'A company uses {{idp}} as their identity provider and wants {{scope}} for engineers across all AWS accounts in their Organization, with no per-account IAM users.',
    options: [
      { text: 'Create IAM users in every account and synchronise passwords from {{idp}}.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Per-account users defeat the federation goal.' } },
      { text: 'Configure AWS IAM Identity Center (SSO) federated with {{idp}} and assign permission sets per account.', correct: true },
      { text: 'Use {{idp}} only for the management account; child accounts keep IAM users.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Half-federation leaves child accounts with the same problem.' } },
      { text: 'Issue long-lived access keys to engineers and rotate quarterly via {{idp}} scripts.', correct: false, distractor: { type: 'iam-user-when-role-needed', explanation: 'Long-lived keys are the anti-pattern federation eliminates.' } },
    ],
    explanation: 'IAM Identity Center is the AWS-native bridge to {{idp}}: SAML/SCIM sync, permission sets per account, short-lived role credentials. No IAM users needed.',
  },

  {
    id: 'tpl-103',
    conceptSlug: 'scp-organizations',
    blueprintTaskId: '1.1',
    patternTag: 'compliance-immutable',
    difficulty: 0.65,
    slots: {
      restriction: ['only the eu-west-1 and eu-central-1 Regions', 'only approved instance families', 'only services on the approved list'],
      target: ['developer', 'data-science', 'sandbox'],
    },
    stem: 'Compliance requires that workloads in the {{target}} OU run {{restriction}}. The control must hold even if a member-account admin attaches a permissive IAM policy.',
    options: [
      { text: 'Attach an IAM-policy boilerplate to every developer in those accounts.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'IAM policies are per-identity; SCPs are organizational.' } },
      { text: 'Apply a Service Control Policy at the {{target}} OU that denies actions outside {{restriction}}.', correct: true },
      { text: 'Set CloudWatch alarms on CloudTrail events to alert on violations.', correct: false, distractor: { type: 'monitoring-observability', explanation: 'Detection ≠ prevention; SCPs prevent.' } },
      { text: 'Configure AWS Config rules in detection mode and remediate via Lambda.', correct: false, distractor: { type: 'monitoring-observability', explanation: 'Config detects drift; SCPs are a hard ceiling.' } },
    ],
    explanation: 'SCPs at the OU level cap maximum effective permissions for every principal in member accounts — IAM policies cannot grant past an SCP deny. Detection-only solutions cannot satisfy a "must hold" requirement.',
  },

  // ───── Domain 1: Secure (1.2 — Data Protection) ─────
  {
    id: 'tpl-104',
    conceptSlug: 'kms-encryption',
    blueprintTaskId: '1.2',
    patternTag: 'data-encryption',
    difficulty: 0.55,
    slots: {
      service: ['S3', 'EBS', 'RDS'],
      requirement: ['rotate keys annually with no app changes', 'cryptographically isolate two business units', 'audit every decrypt call to CloudTrail'],
    },
    stem: 'Data stored in {{service}} must be encrypted such that the team can {{requirement}}. Which approach satisfies the requirement with minimal operational overhead?',
    options: [
      { text: 'Use {{service}} default encryption with an AWS-managed key (aws/{{service}}).', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'AWS-managed keys cannot be configured per BU and rotation is opaque.' } },
      { text: 'Use a customer-managed KMS key with automatic annual rotation enabled.', correct: true },
      { text: 'Encrypt client-side using a key in Secrets Manager and store ciphertext in {{service}}.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Client-side adds key-management burden when KMS suffices.' } },
      { text: 'Disable encryption and rely on TLS in transit only.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'TLS does not protect data at rest.' } },
    ],
    explanation: 'Customer-managed KMS keys (CMKs) support automatic annual rotation, per-key policies for tenant isolation, and CloudTrail decrypt-event logging. AWS-managed keys remove control; client-side encryption adds unnecessary complexity for these requirements.',
  },

  {
    id: 'tpl-105',
    conceptSlug: 'secrets-manager',
    blueprintTaskId: '1.2',
    patternTag: 'least-operational-overhead',
    difficulty: 0.5,
    slots: {
      secret: ['RDS database password', 'third-party API key', 'OAuth client secret'],
      cadence: ['every 30 days', 'every 90 days', 'on every deployment'],
    },
    stem: 'A team needs to rotate a {{secret}} {{cadence}} without downtime and without code changes in their applications.',
    options: [
      { text: 'Store the {{secret}} in an environment variable and redeploy {{cadence}}.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Manual rotation; misses zero-downtime requirement.' } },
      { text: 'Use AWS Secrets Manager with automatic rotation and have applications fetch via SDK with caching.', correct: true },
      { text: 'Store the {{secret}} encrypted in S3 and rotate via Lambda manually.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Reinvents Secrets Manager poorly.' } },
      { text: 'Hardcode the {{secret}} in source and rotate via PR.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Secrets in source is the anti-pattern.' } },
    ],
    explanation: 'Secrets Manager owns the rotation lifecycle: Lambda rotation function, dual-secret strategy for zero downtime, and SDK caching minimises API cost. Apps reference the secret ARN, not the value.',
  },

  {
    id: 'tpl-106',
    conceptSlug: 's3-object-lock',
    blueprintTaskId: '1.2',
    patternTag: 'compliance-immutable',
    difficulty: 0.6,
    slots: {
      regulation: ['SEC 17a-4(f)', 'HIPAA', 'GDPR right-to-erasure'],
      retention: ['7 years', '3 years', '90 days'],
    },
    stem: 'Compliance ({{regulation}}) requires that audit logs be immutable for {{retention}} and provably impossible to delete — including by account root.',
    options: [
      { text: 'Versioning + a bucket policy denying delete actions, reviewed quarterly.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Bucket policies are mutable by root.' } },
      { text: 'S3 Object Lock in Compliance mode with a {{retention}} retention period and Versioning enabled.', correct: true },
      { text: 'Glacier Deep Archive with vault lock and a 1-day retention.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Vault Lock is for vaults, not buckets, and retention does not match.' } },
      { text: 'Replicate to a second bucket with MFA delete enabled.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'MFA delete is bypassable; not WORM.' } },
    ],
    explanation: 'Object Lock Compliance mode is the only S3 control that satisfies SEC 17a-4(f)-style WORM requirements: not even root can delete or shorten retention until expiry. Bucket policies and MFA delete are mutable.',
  },

  // ───── Domain 1: Secure (1.3 — Network Security) ─────
  {
    id: 'tpl-107',
    conceptSlug: 'security-groups-vs-nacls',
    blueprintTaskId: '1.3',
    patternTag: 'network-segmentation',
    difficulty: 0.5,
    slots: {
      tier: ['web tier', 'app tier', 'database tier'],
      source: ['the ALB', 'the bastion subnet', 'the app-tier security group'],
    },
    stem: 'You need to allow inbound traffic to the {{tier}} only from {{source}}, with stateful tracking and minimal rule maintenance as instances scale.',
    options: [
      { text: 'A Network ACL on the subnet with allow rules for {{source}}.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'NACLs are stateless and require return-traffic rules.' } },
      { text: 'A Security Group referencing the source security group as the source.', correct: true },
      { text: 'A Security Group with 0.0.0.0/0 inbound and a host-based firewall.', correct: false, distractor: { type: 'public-when-private-needed', explanation: 'Defeats network-layer segmentation.' } },
      { text: 'No SG rules; rely on VPC route tables to restrict traffic.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'Route tables route, they do not filter.' } },
    ],
    explanation: 'Security Groups are stateful and can reference other SGs as sources — the cleanest pattern for tiered architectures because membership changes propagate without rule edits. NACLs are stateless and per-subnet; reserve them for coarse-grained denies.',
  },

  {
    id: 'tpl-108',
    conceptSlug: 'shield-waf',
    blueprintTaskId: '1.3',
    patternTag: 'most-secure',
    difficulty: 0.55,
    slots: {
      threat: ['SQL injection', 'a Layer-7 DDoS attack', 'OWASP top-10 web exploits'],
      asset: ['a public ALB', 'a CloudFront distribution', 'an API Gateway REST API'],
    },
    stem: 'Mitigate {{threat}} against {{asset}} with the lowest operational overhead.',
    options: [
      { text: 'Deploy a third-party IPS appliance in front of {{asset}}.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Adds operational burden vs. AWS WAF.' } },
      { text: 'Attach AWS WAF to {{asset}} with the AWS Managed Rules core rule set.', correct: true },
      { text: 'Filter the threat in application code at every endpoint.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Per-endpoint code misses paths and is hard to maintain.' } },
      { text: 'Block the source IP ranges with a Security Group.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'SGs are L3/L4; cannot inspect L7 payloads.' } },
    ],
    explanation: 'AWS WAF integrates natively with ALB, CloudFront, and API Gateway and ships managed rule sets covering OWASP top-10 and bot patterns. Maintenance is rule subscription, not engineering.',
  },

  {
    id: 'tpl-109',
    conceptSlug: 'guardduty',
    blueprintTaskId: '1.3',
    patternTag: 'monitoring-observability',
    difficulty: 0.5,
    slots: {
      symptom: ['EC2 instances communicating with known malware C2 servers', 'unusual API calls from a foreign IP', 'a compromised IAM credential being used'],
    },
    stem: 'A security team wants to detect {{symptom}} across all accounts in their Organization with no agent installs.',
    options: [
      { text: 'Stream all VPC Flow Logs and CloudTrail to S3 and write Athena queries.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Reinvents GuardDuty without managed threat intel.' } },
      { text: 'Enable Amazon GuardDuty at the Organization level with delegated administration.', correct: true },
      { text: 'Install a third-party EDR on every EC2 instance.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Agent-based; misses serverless and IAM-only signals.' } },
      { text: 'Enable AWS Config across the Organization.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Config tracks resource state, not threats.' } },
    ],
    explanation: 'GuardDuty consumes VPC Flow Logs, CloudTrail, and DNS logs natively and applies AWS-managed threat-intelligence feeds. Org-level enablement with a delegated admin gives single-pane-of-glass without agents.',
  },

  // ───── Domain 2: Resilient (2.1 — High Availability) ─────
  {
    id: 'tpl-201',
    conceptSlug: 'rds-multi-az',
    blueprintTaskId: '2.1',
    patternTag: 'highest-availability',
    difficulty: 0.45,
    slots: {
      engine: ['RDS for PostgreSQL', 'RDS for MySQL', 'Aurora PostgreSQL'],
      sla: ['99.95%', '99.99%'],
    },
    stem: 'A production database on {{engine}} must meet a {{sla}} availability SLA within a single Region with synchronous replication and automatic failover.',
    options: [
      { text: 'Single-AZ {{engine}} with daily snapshots.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Single-AZ cannot meet {{sla}}.' } },
      { text: 'Multi-AZ deployment of {{engine}} with automatic failover.', correct: true },
      { text: 'Read replicas in another Region with manual promotion.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Async cross-Region; manual failover.' } },
      { text: 'Self-managed PostgreSQL on EC2 in one AZ with Multi-AZ EBS.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'EBS Multi-AZ does not exist; conflates terms.' } },
    ],
    explanation: 'Multi-AZ on {{engine}} is the AWS-native answer: synchronous standby in a second AZ, automatic DNS-based failover, and zero customer-managed orchestration. Cross-Region replicas are for DR, not in-Region HA.',
  },

  {
    id: 'tpl-202',
    conceptSlug: 'ec2-auto-scaling',
    blueprintTaskId: '2.1',
    patternTag: 'fault-tolerant-design',
    difficulty: 0.5,
    slots: {
      workload: ['a stateless web tier', 'a queue-driven worker tier', 'an API tier'],
      signal: ['CPU > 60%', 'SQS visible-message count', 'ALB requests-per-target'],
    },
    stem: 'Design a fault-tolerant {{workload}} that scales on {{signal}} and survives the loss of an entire AZ in a Region with three AZs.',
    options: [
      { text: 'A single On-Demand instance with CloudWatch alarms paging on-call.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'No redundancy; AZ loss = outage.' } },
      { text: 'An Auto Scaling Group spanning all three AZs with a target-tracking policy on {{signal}}.', correct: true },
      { text: 'A fixed fleet of two instances pinned to one AZ behind a Network Load Balancer.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Static fleet cannot follow {{signal}}.' } },
      { text: 'Lambda behind API Gateway with provisioned concurrency.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Replatform, not the requested fault-tolerance pattern.' } },
    ],
    explanation: 'An ASG across three AZs rebalances after AZ loss, target-tracking auto-adjusts capacity to {{signal}}, and integrating with the appropriate load balancer gives a stateless tier its standard HA topology.',
  },

  {
    id: 'tpl-203',
    conceptSlug: 'elb-types',
    blueprintTaskId: '2.1',
    patternTag: 'highest-availability',
    difficulty: 0.55,
    slots: {
      protocol: ['HTTP/2 with host-based routing', 'TCP at millions of pps with static IPs', 'gRPC with path-based routing'],
    },
    stem: 'Choose the load balancer for {{protocol}}.',
    options: [
      { text: 'Classic Load Balancer.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'Legacy; lacks the features needed.' } },
      { text: 'Application Load Balancer (ALB) for HTTP/HTTPS/gRPC; Network Load Balancer (NLB) for TCP/UDP at scale with static IPs.', correct: true },
      { text: 'Network Load Balancer for HTTP host-based routing.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'NLB is L4; cannot inspect HTTP host.' } },
      { text: 'Gateway Load Balancer.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'GWLB is for inserting third-party appliances.' } },
    ],
    explanation: 'ALB handles HTTP/2, gRPC, host/path-based routing. NLB handles raw TCP/UDP at millions of pps with static IPs. CLB is legacy. GWLB is for L3 traffic into virtual appliances.',
    maxVariants: 6,
  },

  // ───── Domain 2: Resilient (2.2 — DR & Backup) ─────
  {
    id: 'tpl-204',
    conceptSlug: 'aurora-global',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.65,
    slots: {
      rpo: ['under 1 second', 'under 5 minutes'],
      rto: ['under 1 minute', 'under 15 minutes'],
    },
    stem: 'A relational workload on Aurora needs cross-Region DR with RPO {{rpo}} and RTO {{rto}}.',
    options: [
      { text: 'Daily mysqldump exports to S3 in a secondary Region.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'RPO = 24h; nowhere near {{rpo}}.' } },
      { text: 'Aurora Global Database with managed planned and unplanned failover.', correct: true },
      { text: 'Multi-AZ in a single Region.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Multi-AZ is in-Region; not DR.' } },
      { text: 'AWS Backup with cross-Region copy on a 4-hour schedule.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'RPO = up to 4h; restore time exceeds {{rto}}.' } },
    ],
    explanation: 'Aurora Global Database streams via dedicated infra with typical replication lag under 1 second; managed unplanned failover meets RTO under a minute. AWS Backup is for warm-standby/pilot-light DR, not active-active or sub-second RPO.',
  },

  {
    id: 'tpl-205',
    conceptSlug: 'aws-backup',
    blueprintTaskId: '2.2',
    patternTag: 'least-operational-overhead',
    difficulty: 0.5,
    slots: {
      services: ['EBS, RDS, and DynamoDB', 'EFS, FSx, and EBS', 'DynamoDB, S3, and Aurora'],
      retention: ['35 days hot + 7 years cold', '90 days hot + 1 year cold'],
    },
    stem: 'Implement a unified backup policy for {{services}} with {{retention}}, cross-Region copy, and central audit reporting.',
    options: [
      { text: 'Custom Lambda functions per service triggered on schedule.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents AWS Backup.' } },
      { text: 'AWS Backup with a backup plan, cross-Region copy rule, and AWS Backup Audit Manager.', correct: true },
      { text: 'EBS lifecycle manager only.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Covers EBS only; misses other services.' } },
      { text: 'Manual snapshots taken by the on-call engineer.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Not auditable, not scheduled.' } },
    ],
    explanation: 'AWS Backup centralises backup policies across services, automates cross-Region copy, and Audit Manager produces compliance reports out-of-the-box.',
  },

  // ───── Domain 3: Performant (3.1 — Storage) ─────
  {
    id: 'tpl-301',
    conceptSlug: 'ebs-volume-types',
    blueprintTaskId: '3.1',
    patternTag: 'highest-throughput',
    difficulty: 0.6,
    slots: {
      iops: ['16,000', '64,000', '256,000'],
      latency: ['millisecond', 'sub-millisecond'],
    },
    stem: 'Choose the EBS volume type for sustained {{iops}} IOPS at {{latency}} latency.',
    options: [
      { text: 'gp3 General Purpose SSD.', correct: false, distractor: { type: 'misses-durability-tier', explanation: 'gp3 caps at 16,000 IOPS.' } },
      { text: 'io2 Block Express SSD with provisioned IOPS.', correct: true },
      { text: 'st1 Throughput Optimized HDD.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'HDD; OLTP latency profile is wrong.' } },
      { text: 'sc1 Cold HDD.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Archival HDD; not suitable for hot OLTP.' } },
    ],
    explanation: 'io2 Block Express scales to 256K IOPS at sub-millisecond latency with 99.999% durability — the only EBS family for mission-critical, high-IOPS, low-latency workloads. gp3 caps at 16K IOPS; HDDs (st1/sc1) are sequential-throughput tiers.',
    filter: r => !(r.iops !== '16,000' && r.latency === 'millisecond'),
  },

  {
    id: 'tpl-302',
    conceptSlug: 'efs-vs-fsx',
    blueprintTaskId: '3.1',
    patternTag: 'highest-throughput',
    difficulty: 0.6,
    slots: {
      workload: ['HPC genomics with parallel I/O at 100s GB/s', 'Windows applications needing SMB shares', 'Linux containers needing shared POSIX storage that scales elastically'],
    },
    stem: 'Pick the AWS-managed shared file system for: {{workload}}.',
    options: [
      { text: 'Amazon EFS Standard.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'EFS is NFS for Linux; not HPC parallel.' } },
      { text: 'FSx for Lustre for HPC; FSx for Windows for SMB; EFS for elastic POSIX shared storage.', correct: true },
      { text: 'S3 mounted via s3fs-fuse on every host.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Object storage hack; not a filesystem.' } },
      { text: 'EBS Multi-Attach.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Same-AZ block, not shared FS.' } },
    ],
    explanation: 'FSx for Lustre is the HPC parallel filesystem (S3-linked, hundreds of GB/s). FSx for Windows is the managed SMB/Active-Directory file server. EFS is the elastic NFS for Linux containers and serverless workloads.',
    maxVariants: 6,
  },

  {
    id: 'tpl-303',
    conceptSlug: 's3-storage-classes',
    blueprintTaskId: '3.1',
    patternTag: 'storage-tier-selection',
    difficulty: 0.5,
    slots: {
      access: ['accessed daily', 'accessed monthly with millisecond retrieval', 'archived for compliance, retrieved annually'],
    },
    stem: 'Pick the S3 storage class for data {{access}}.',
    options: [
      { text: 'S3 Standard for daily access; S3 Standard-IA for monthly with ms retrieval; Glacier Deep Archive for annual compliance.', correct: true },
      { text: 'S3 Standard for everything.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Standard for cold data wastes money.' } },
      { text: 'Glacier Deep Archive for everything.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: '12-hour retrieval breaks daily access.' } },
      { text: 'S3 Intelligent-Tiering everywhere with no thought to access pattern.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Adds monitoring fee on tiny objects; explicit class is cheaper here.' } },
    ],
    explanation: 'Match the storage class to access pattern: Standard for hot, Standard-IA for warm with ms retrieval, Glacier Deep Archive for cold compliance. Intelligent-Tiering is great when access is unknown; for known patterns explicit classes win.',
    maxVariants: 4,
  },

  // ───── Domain 3: Performant (3.2 — Edge & Caching) ─────
  {
    id: 'tpl-304',
    conceptSlug: 'cloudfront-caching',
    blueprintTaskId: '3.2',
    patternTag: 'lowest-latency',
    difficulty: 0.5,
    slots: {
      asset: ['static images and JS bundles', 'a global REST API', 'video on demand'],
      audience: ['globally distributed users', 'users across three continents', 'a regional EU audience with EU-only data residency'],
    },
    stem: 'Reduce latency for {{asset}} served to {{audience}} with origin offload.',
    options: [
      { text: 'Serve directly from S3 in us-east-1.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'No edge cache; far-region users suffer.' } },
      { text: 'CloudFront in front of the origin with appropriate cache behaviors and origin shield.', correct: true },
      { text: 'Replicate the origin to every Region and use Route 53 latency routing.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Replicates origin; CloudFront edges already do this for cacheable content.' } },
      { text: 'Use API Gateway edge endpoint without CloudFront.', correct: false, distractor: { type: 'misuses-caching', explanation: 'API Gateway edge IS CloudFront, but not a fit for static asset serving.' } },
    ],
    explanation: 'CloudFront pushes content to ~600 edge POPs and offloads the origin. Origin Shield consolidates origin requests further. For EU-only residency you can restrict via geo-restriction and pick EU edge locations price class.',
  },

  {
    id: 'tpl-305',
    conceptSlug: 'elasticache',
    blueprintTaskId: '3.2',
    patternTag: 'caching-strategy',
    difficulty: 0.55,
    slots: {
      pattern: ['session storage with sub-ms reads', 'a leaderboard with sorted-set semantics', 'a write-through cache in front of RDS'],
    },
    stem: 'Implement {{pattern}} with the lowest latency.',
    options: [
      { text: 'DAX in front of DynamoDB.', correct: false, distractor: { type: 'misuses-caching', explanation: 'DAX is a DynamoDB cache, not generic.' } },
      { text: 'ElastiCache for Redis with the appropriate data structures.', correct: true },
      { text: 'A self-managed Memcached on EC2 with one node.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Lacks Redis structures and HA.' } },
      { text: 'CloudFront with a 1-second TTL.', correct: false, distractor: { type: 'misuses-caching', explanation: 'Edge cache, not data cache; cannot do sorted sets.' } },
    ],
    explanation: 'Redis ships sorted sets, hashes, pub/sub, and replication — all needed for leaderboard, session, and cache-aside patterns. DAX is DynamoDB-only. CloudFront caches HTTP, not application data structures.',
    maxVariants: 4,
  },

  {
    id: 'tpl-306',
    conceptSlug: 'route53-routing',
    blueprintTaskId: '3.2',
    patternTag: 'highest-availability',
    difficulty: 0.55,
    slots: {
      goal: ['route users to the closest healthy Region', 'fail over from primary to DR Region', 'split traffic 90/10 for canary'],
    },
    stem: 'Use Route 53 to {{goal}}.',
    options: [
      { text: 'Simple routing with one A record per Region.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Simple is round-robin without health.' } },
      { text: 'The right Route 53 routing policy: latency for closest healthy, failover for primary/DR, weighted for canary, all with health checks.', correct: true },
      { text: 'CloudFront with origin failover only.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'CloudFront origin failover is one piece; Route 53 covers all three.' } },
      { text: 'A custom Lambda that polls and updates DNS records.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Route 53.' } },
    ],
    explanation: 'Route 53 routing policies map directly to these intents: latency-based for closest, failover for primary/secondary with health checks, weighted for canary/AB. Simple routing has no health awareness.',
    maxVariants: 3,
  },

  // ───── Domain 3: Performant (3.3 — Decoupling) ─────
  {
    id: 'tpl-307',
    conceptSlug: 'sqs-vs-sns-vs-eventbridge',
    blueprintTaskId: '3.3',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.55,
    slots: {
      pattern: ['fan-out one event to many subscribers', 'reliable point-to-point work queue', 'route events by content from many SaaS sources to many targets'],
    },
    stem: 'Pick the messaging service for: {{pattern}}.',
    options: [
      { text: 'SQS for fan-out, SNS for queues, EventBridge for everything else.', correct: false, distractor: { type: 'sync-when-decoupled-needed', explanation: 'Mixes the roles up.' } },
      { text: 'SNS for fan-out pub/sub; SQS for point-to-point queues; EventBridge for content-based routing across SaaS and AWS sources.', correct: true },
      { text: 'Kinesis Data Streams for everything.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Streams are ordered records, not pub/sub; overkill here.' } },
      { text: 'A self-managed RabbitMQ on EC2.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Operational burden vs. managed services.' } },
    ],
    explanation: 'SNS = pub/sub fan-out; SQS = durable point-to-point queue with at-least-once delivery; EventBridge = schema-aware content routing with SaaS partner sources. Picking the right service prevents architectural debt later.',
    maxVariants: 3,
  },

  {
    id: 'tpl-308',
    conceptSlug: 'step-functions',
    blueprintTaskId: '3.3',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.55,
    slots: {
      workflow: ['a 5-step ETL with retry logic', 'a human-approval workflow with a 7-day wait', 'a parallel fan-out / fan-in batch job'],
    },
    stem: 'Implement {{workflow}} with the lowest operational overhead.',
    options: [
      { text: 'Chain Lambdas via SNS topics with custom retry code in each.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Step Functions error handling.' } },
      { text: 'AWS Step Functions with the appropriate state types (Task, Wait, Parallel, Choice).', correct: true },
      { text: 'A cron-driven script on EC2 that loops through steps.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'No managed retries, observability, or state.' } },
      { text: 'EventBridge rules invoking Lambdas in sequence with hard-coded delays.', correct: false, distractor: { type: 'sync-when-decoupled-needed', explanation: 'No durable state machine semantics.' } },
    ],
    explanation: 'Step Functions provides durable state, native retry/catch, parallel/map states, and Wait up to a year — ideal for orchestrated multi-step workflows without bespoke retry code.',
    maxVariants: 3,
  },

  // ───── Domain 3: Performant (3.4 — Compute selection) ─────
  {
    id: 'tpl-309',
    conceptSlug: 'lambda-patterns',
    blueprintTaskId: '3.4',
    patternTag: 'serverless-vs-container',
    difficulty: 0.55,
    slots: {
      workload: ['short HTTP request handlers', 'long-running ML training jobs', 'persistent WebSocket connections at high scale'],
    },
    stem: 'Choose the AWS compute primitive for {{workload}}.',
    options: [
      { text: 'Lambda for short handlers; ECS/EKS for long-running; API Gateway WebSocket + Lambda or AppSync for WebSockets.', correct: true },
      { text: 'Lambda for everything.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: '15-minute timeout breaks long jobs; persistent connections cost more than a Fargate fleet.' } },
      { text: 'EC2 for everything to avoid cold starts.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Operational burden for short handlers.' } },
      { text: 'Lambda@Edge for everything.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Edge has stricter limits.' } },
    ],
    explanation: 'Lambda excels at short, event-driven work (≤15 min). Long jobs belong on ECS/EKS/Batch. Persistent connections at scale need API Gateway WebSocket or AppSync; otherwise you pay for idle.',
    maxVariants: 3,
  },

  // ───── Domain 3: Performant (3.5 — Data) ─────
  {
    id: 'tpl-310',
    conceptSlug: 'redshift-fundamentals',
    blueprintTaskId: '3.5',
    patternTag: 'least-operational-overhead',
    difficulty: 0.55,
    slots: {
      need: ['ad-hoc SQL over S3', 'managed data catalog with ETL jobs', 'governance and row-level security across the lake'],
    },
    stem: 'For {{need}} pick the AWS-managed service.',
    options: [
      { text: 'Athena for ad-hoc SQL, Glue for catalog/ETL, Lake Formation for governance.', correct: true },
      { text: 'EMR for everything.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'EMR is a Hadoop cluster; heavy for ad-hoc or governance.' } },
      { text: 'Redshift for ad-hoc S3 SQL with no Spectrum.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Plain Redshift is warehouse, not lake.' } },
      { text: 'Self-managed Presto on EC2.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Athena is the managed Presto.' } },
    ],
    explanation: 'The S3 data-lake stack maps cleanly: Athena (serverless SQL), Glue (catalog + ETL), Lake Formation (permissions, row/column-level security). EMR is for code-heavy Spark/Hadoop, not ad-hoc.',
    maxVariants: 3,
  },

  // ───── Domain 4: Cost (4.1 — Cost-effective storage) ─────
  {
    id: 'tpl-401',
    conceptSlug: 's3-storage-classes',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      pattern: ['unknown access patterns over time', 'always hot for the first 30 days then rarely accessed for 1 year', 'objects under 128 KB accessed daily'],
    },
    stem: 'Optimise S3 cost for: {{pattern}}.',
    options: [
      { text: 'Match: Intelligent-Tiering for unknown; lifecycle Standard→Standard-IA→Glacier for known cooling pattern; Standard for small hot objects.', correct: true },
      { text: 'Intelligent-Tiering for everything.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Monitoring fee dominates on small objects.' } },
      { text: 'Glacier Deep Archive everywhere.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Breaks daily access SLAs.' } },
      { text: 'Standard everywhere.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Wastes money on cold tail.' } },
    ],
    explanation: 'Intelligent-Tiering wins for unknown access; explicit lifecycle (Standard → IA → Glacier) wins when the cooling curve is known; Standard for hot small objects avoids the IT monitoring fee.',
    maxVariants: 3,
  },

  // ───── Domain 4: Cost (4.2 — Cost-effective compute) ─────
  {
    id: 'tpl-402',
    conceptSlug: 'savings-plans-strategy',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      mix: ['EC2 + Fargate + Lambda across multiple Regions and OSes', 'a single EC2 family in one Region', 'EC2 with frequent family changes within one Region'],
    },
    stem: 'Maximum-discount commitment for: {{mix}}.',
    options: [
      { text: 'Compute Savings Plans for cross-service flexibility; EC2 Standard RIs for fixed family/Region; Convertible RIs for changing families.', correct: true },
      { text: 'On-Demand pricing across all workloads with no commitment.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Leaves discounts on the table.' } },
      { text: 'EC2 Standard Reserved Instances for every workload uniformly.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Locks family/Region; no flex.' } },
      { text: 'Spot Instances exclusively to maximise hourly discount.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Spot is for interruptible workloads.' } },
    ],
    explanation: 'Compute Savings Plans give the most flexibility (EC2 + Fargate + Lambda, any Region, any OS, any family) at up to 66% off. Standard RIs lock family/Region for max discount when the mix is fixed. Convertible RIs let you swap families for less discount.',
    maxVariants: 3,
  },

  {
    id: 'tpl-403',
    conceptSlug: 'spot-fleet-strategies',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      workload: ['fault-tolerant batch processing', 'stateful database', 'a stateless API tier with strict SLA'],
    },
    stem: 'Use Spot when running: {{workload}}?',
    options: [
      { text: 'Yes for fault-tolerant batch with capacity-optimized allocation; No for stateful DB; Spot only as a fraction of a mixed-instances ASG for strict-SLA stateless tiers.', correct: true },
      { text: 'Use Spot for every workload to maximise hourly savings.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Interruption breaks stateful DBs.' } },
      { text: 'Avoid Spot entirely and run everything On-Demand.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Leaves up-to-90% savings on the table for batch.' } },
      { text: 'Use Spot Blocks for guaranteed durations (deprecated feature).', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Spot Blocks are no longer offered.' } },
    ],
    explanation: 'Spot is for interruption-tolerant work. Capacity-optimized allocation reduces interruption risk. Mixed-instances ASGs let you blend On-Demand baseline + Spot for strict-SLA stateless tiers. Stateful single-instance workloads should not run on Spot alone.',
    maxVariants: 3,
  },

  // ───── Domain 4: Cost (4.3 — Database cost) ─────
  {
    id: 'tpl-404',
    conceptSlug: 'aurora-performance',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      profile: ['unpredictable bursty traffic with long idle periods', 'steady 4 vCPU all day every day', 'dev/test environments used 9-5 weekdays'],
    },
    stem: 'Cheapest Aurora deployment for: {{profile}}.',
    options: [
      { text: 'Aurora Serverless v2 for bursty/idle and dev/test; provisioned Aurora with reserved capacity for steady all-day load.', correct: true },
      { text: 'Aurora Serverless for everything.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Steady load is cheaper provisioned + RIs.' } },
      { text: 'Provisioned Aurora on On-Demand for everything.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'No RIs; idle hours are billed.' } },
      { text: 'RDS Multi-AZ for everything.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'RDS, not Aurora; misses Serverless v2.' } },
    ],
    explanation: 'Aurora Serverless v2 scales by ACUs in seconds and idles cheaply — ideal for bursty/idle. Steady predictable load is cheapest on provisioned Aurora with reserved instances.',
    maxVariants: 3,
  },

  // ───── Domain 4: Cost (4.4 — Cost monitoring) ─────
  {
    id: 'tpl-405',
    conceptSlug: 'aws-budgets-cost-explorer',
    blueprintTaskId: '4.4',
    patternTag: 'monitoring-observability',
    difficulty: 0.45,
    slots: {
      goal: ['alert when monthly EC2 spend exceeds $5,000', 'forecast next-quarter spend by tag', 'identify idle EBS volumes and old snapshots'],
    },
    stem: 'Pick the AWS-native tool for: {{goal}}.',
    options: [
      { text: 'AWS Budgets for thresholds/alerts; Cost Explorer for forecasting and tag-based grouping; Trusted Advisor for idle-resource recommendations.', correct: true },
      { text: 'A custom CloudWatch dashboard polling Cost & Usage Report manually.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Budgets/Explorer/TA exist for these jobs.' } },
      { text: 'Tag every resource and read the bill PDF.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'No alerting or forecasting.' } },
      { text: 'AWS Config for cost monitoring.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Config is config drift, not cost.' } },
    ],
    explanation: 'AWS Budgets handles thresholds and alerts; Cost Explorer handles trends, forecasts, and tag aggregation; Trusted Advisor surfaces idle/unused resources for savings.',
    maxVariants: 3,
  },
]

export function summarizeExpansion(expanded: ExpandedQuestion[]): {
  total: number
  perTask: Record<string, number>
  perDomain: Record<string, number>
} {
  const perTask: Record<string, number> = {}
  const perDomain: Record<string, number> = {}
  for (const q of expanded) {
    perTask[q.blueprintTaskId] = (perTask[q.blueprintTaskId] ?? 0) + 1
    const d = q.blueprintTaskId.split('.')[0] ?? 'unknown'
    perDomain[d] = (perDomain[d] ?? 0) + 1
  }
  return { total: expanded.length, perTask, perDomain }
}
