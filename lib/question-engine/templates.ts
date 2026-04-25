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

  // ───── Domain 2: Resilient (extra coverage to hit weight target) ─────
  {
    id: 'tpl-206',
    conceptSlug: 'dynamodb-resilience',
    blueprintTaskId: '2.1',
    patternTag: 'highest-availability',
    difficulty: 0.55,
    slots: {
      need: ['active-active multi-Region writes', 'cross-Region replication for DR', 'point-in-time recovery for the last 35 days'],
    },
    stem: 'A DynamoDB workload requires {{need}} with managed operations.',
    options: [
      { text: 'Take nightly mysqldump-style exports and restore them in a second Region.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Daily exports cannot deliver active-active or PITR.' } },
      { text: 'Enable DynamoDB Global Tables for multi-Region writes; PITR for 35-day recovery.', correct: true },
      { text: 'Run DynamoDB on a single-AZ self-managed Cassandra cluster.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Self-managed loses every DynamoDB benefit.' } },
      { text: 'Use DAX as the durability layer.', correct: false, distractor: { type: 'misuses-caching', explanation: 'DAX is a cache, not a replica or backup.' } },
    ],
    explanation: 'Global Tables give multi-Region active-active replication with last-writer-wins; Point-in-Time Recovery gives 35-day per-second restore. Together they cover both availability and operational recovery without custom tooling.',
    maxVariants: 3,
  },

  {
    id: 'tpl-207',
    conceptSlug: 's3-replication',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.55,
    slots: {
      need: ['cross-Region disaster recovery for S3 data', 'compliance-driven cross-account isolation of replicas', 'low-latency reads close to global users'],
      sla: ['15-minute RPO', '1-hour RPO'],
    },
    stem: 'For {{need}} with a {{sla}}, what S3 feature should be configured?',
    options: [
      { text: 'A Lambda triggered on PUT that copies objects to the destination bucket.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents S3 Replication and breaks under load.' } },
      { text: 'S3 Cross-Region Replication (CRR) with Replication Time Control (RTC) for the 15-minute RPO SLA.', correct: true },
      { text: 'Daily AWS Backup copy jobs across Regions.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Daily cadence misses tight RPOs.' } },
      { text: 'Cross-Region snapshot of the bucket.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'S3 buckets are not snapshottable.' } },
    ],
    explanation: 'CRR replicates new objects asynchronously; with Replication Time Control 99.99% of objects replicate within 15 minutes (a contractual SLA). For cross-account replicas, CRR can target a destination owned by another account.',
    maxVariants: 6,
  },

  {
    id: 'tpl-208',
    conceptSlug: 'rds-backups-snapshots',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.5,
    slots: {
      strategy: ['backup & restore', 'pilot light', 'warm standby', 'multi-site active-active'],
    },
    stem: 'Pick the AWS service mix for an RDS-based DR strategy of type "{{strategy}}".',
    options: [
      { text: 'Automated daily snapshots only; no DR plan defined for the workload.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Single-Region only; not a DR strategy.' } },
      { text: 'Map strategy → service mix: snapshots+copy for backup, read replica for pilot light, scaled-down active for warm standby, Aurora Global Database for multi-site.', correct: true },
      { text: 'Use Aurora Global Database uniformly for every DR strategy tier.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Overkill for backup & restore tier.' } },
      { text: 'Multi-AZ deployments alone replace every DR tier strategy.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Multi-AZ is in-Region HA, not DR.' } },
    ],
    explanation: 'The four canonical DR strategies map to RPO/RTO budgets and cost. Snapshots cover the cheapest end; Aurora Global Database covers the active-active end with sub-second replication.',
    maxVariants: 4,
  },

  {
    id: 'tpl-209',
    conceptSlug: 'vpc-fundamentals',
    blueprintTaskId: '2.1',
    patternTag: 'fault-tolerant-design',
    difficulty: 0.5,
    slots: {
      tier: ['the public-facing tier', 'the private app tier', 'the database tier'],
      azCount: ['two AZs', 'three AZs'],
    },
    stem: 'Design a VPC topology that survives the loss of a single AZ for {{tier}} across {{azCount}}.',
    options: [
      { text: 'A single subnet in one AZ with EIP failover scripts.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Single subnet collapses on AZ loss.' } },
      { text: 'One subnet per AZ; NAT Gateway in each AZ for private subnets; route tables per AZ.', correct: true },
      { text: 'A single NAT Gateway shared across AZs.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'Single NAT becomes a Cross-AZ failure point.' } },
      { text: 'Use Transit Gateway as the only network primitive.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'TGW is for many-VPC; not the per-AZ HA primitive.' } },
    ],
    explanation: 'AZ loss is the canonical failure unit. The HA recipe is one subnet per AZ per tier, an AZ-local NAT Gateway for private egress, and route tables that keep traffic within an AZ unless a target is unhealthy.',
    maxVariants: 6,
  },

  {
    id: 'tpl-210',
    conceptSlug: 'aws-backup',
    blueprintTaskId: '2.2',
    patternTag: 'compliance-immutable',
    difficulty: 0.6,
    slots: {
      mandate: ['ransomware-resistant immutable backups', 'cross-account isolation from production', 'legal hold on backups beyond their retention'],
    },
    stem: 'A regulated company needs {{mandate}} for AWS Backup recovery points.',
    options: [
      { text: 'Manually copy snapshots to a personal AWS account.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Not WORM, not auditable.' } },
      { text: 'Use AWS Backup Vault Lock in compliance mode plus cross-account backup copy and Legal Hold.', correct: true },
      { text: 'A bucket policy denying delete on the backup bucket.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Bucket policies are mutable by root.' } },
      { text: 'MFA-delete on the backup S3 bucket.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'MFA-delete is bypassable; not WORM.' } },
    ],
    explanation: 'Vault Lock in compliance mode is WORM (not even root can shorten retention). Cross-account backup copy isolates from a compromised production account. Legal Hold prevents deletion beyond retention until manually released.',
    maxVariants: 3,
  },

  {
    id: 'tpl-211',
    conceptSlug: 'transit-gateway',
    blueprintTaskId: '2.1',
    patternTag: 'fault-tolerant-design',
    difficulty: 0.6,
    slots: {
      topology: ['50 VPCs across 4 accounts in one Region', 'on-prem + 20 VPCs with overlapping traffic patterns', 'multi-Region VPC connectivity with managed peering'],
    },
    stem: 'For {{topology}} with HA and minimal mesh complexity, choose the connectivity primitive.',
    options: [
      { text: 'Full-mesh VPC Peering between every pair of VPCs.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'O(N²) complexity; route tables explode.' } },
      { text: 'AWS Transit Gateway as the central hub, with TGW peering for cross-Region and Direct Connect Gateway for on-prem.', correct: true },
      { text: 'A VPN Gateway per VPC.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'No central routing; per-VPC management.' } },
      { text: 'PrivateLink for everything.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'PrivateLink exposes services, not full VPC routing.' } },
    ],
    explanation: 'Transit Gateway is the AWS hub-and-spoke router: one attachment per VPC, route tables for segmentation, TGW peering for cross-Region, and Direct Connect Gateway integration for on-prem. Replaces full-mesh peering at scale.',
    maxVariants: 3,
  },

  // ───── Domain 3: Performant (3.1 — Storage) ─────
  {
    id: 'tpl-301',
    conceptSlug: 'ebs-volume-types',
    blueprintTaskId: '3.1',
    patternTag: 'highest-throughput',
    difficulty: 0.6,
    slots: {
      iops: ['16,000', '64,000', '128,000', '256,000'],
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
    conceptSlug: 'athena-fundamentals',
    blueprintTaskId: '3.5',
    patternTag: 'least-operational-overhead',
    difficulty: 0.5,
    slots: {
      pattern: ['ad-hoc SQL over JSON logs in S3 with no infrastructure', 'querying CloudTrail logs once a week', 'analysing VPC Flow Logs on demand'],
    },
    stem: 'A team needs {{pattern}} and wants to pay only for the data scanned.',
    options: [
      { text: 'Provision a Redshift cluster and COPY the logs nightly.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Cluster overhead for ad-hoc workloads.' } },
      { text: 'Use Amazon Athena over the S3 prefix with a Glue Data Catalog table.', correct: true },
      { text: 'Spin up an EMR cluster running Presto for each query.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'EMR is heavy for ad-hoc queries.' } },
      { text: 'Self-host Presto on EC2 and mount S3 with s3fs.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Athena is the managed Presto.' } },
    ],
    explanation: 'Athena is serverless Presto: pay-per-TB-scanned, no cluster, integrates with Glue Catalog, and converting source files to Parquet plus partitioning slashes scan cost further.',
  },

  {
    id: 'tpl-311',
    conceptSlug: 'glue-catalog-etl',
    blueprintTaskId: '3.5',
    patternTag: 'least-operational-overhead',
    difficulty: 0.55,
    slots: {
      need: ['discover schemas of new S3 data automatically', 'run a Spark ETL pipeline without managing clusters', 'maintain a central metastore for Athena and Redshift Spectrum'],
    },
    stem: 'A data platform team needs to {{need}}.',
    options: [
      { text: 'Stand up a self-managed Hive metastore on EC2.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'AWS Glue replaces this entirely.' } },
      { text: 'Use AWS Glue (Crawlers, ETL jobs, and the Data Catalog).', correct: true },
      { text: 'Run a permanent EMR cluster with Hive Metastore enabled.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Cluster overhead for a metastore.' } },
      { text: 'Store schemas in DynamoDB and reference manually from queries.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Glue Catalog.' } },
    ],
    explanation: 'Glue covers the three roles: Crawlers infer schema, ETL jobs run serverless Spark, and the Data Catalog is the canonical metastore that Athena, EMR, Redshift Spectrum, and Lake Formation all consume.',
    maxVariants: 3,
  },

  {
    id: 'tpl-312',
    conceptSlug: 'lake-formation-governance',
    blueprintTaskId: '3.5',
    patternTag: 'most-secure',
    difficulty: 0.6,
    slots: {
      requirement: ['row-level security so EU analysts only see EU customer rows', 'cross-account data sharing without copying objects', 'tag-based access control across hundreds of tables'],
    },
    stem: 'A data platform must enforce {{requirement}} on a data lake catalogued in Glue.',
    options: [
      { text: 'Write a Lambda that checks the user identity in every Athena query.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Lake Formation poorly.' } },
      { text: 'Use AWS Lake Formation permissions with data filters and LF-Tags.', correct: true },
      { text: 'Replicate data to per-team S3 buckets and use IAM bucket policies.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Data duplication; ungovernable at scale.' } },
      { text: 'Apply Service Control Policies at the Organization level only.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'SCPs cannot do row/column filtering.' } },
    ],
    explanation: 'Lake Formation extends the Glue Catalog with SQL-style GRANT/REVOKE, row/cell-level filters, LF-Tags for tag-based access control, and cross-account sharing via Resource Links — without copying data.',
    maxVariants: 3,
  },

  // ───── Domain 4: Cost (4.4 — Cost monitoring, more) ─────
  {
    id: 'tpl-406',
    conceptSlug: 'compute-optimizer',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      resource: ['EC2 instances', 'EBS volumes', 'Lambda functions'],
    },
    stem: 'A team wants ML-based right-sizing recommendations for their {{resource}} based on actual utilisation.',
    options: [
      { text: 'Read CloudWatch metrics manually and pick smaller instances by intuition.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Compute Optimizer automates this with ML.' } },
      { text: 'Enable AWS Compute Optimizer and act on its recommendations.', correct: true },
      { text: 'Use AWS Trusted Advisor only.', correct: false, distractor: { type: 'monitoring-observability', explanation: 'TA covers idle resources, not ML right-sizing.' } },
      { text: 'Pay a third-party SaaS to analyse the Cost & Usage Report.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Compute Optimizer is free and AWS-native.' } },
    ],
    explanation: 'Compute Optimizer uses ML on CloudWatch metrics to recommend right-sizing for EC2, EBS, Lambda, ECS-on-Fargate, and ASGs. Free of charge, surfaces both downsizing and upsizing opportunities.',
    maxVariants: 3,
  },

  {
    id: 'tpl-407',
    conceptSlug: 'tag-policies',
    blueprintTaskId: '4.4',
    patternTag: 'monitoring-observability',
    difficulty: 0.55,
    slots: {
      goal: ['split monthly cost by team and project', 'block non-compliant tags at creation time', 'enforce that every resource has a CostCenter tag'],
    },
    stem: 'Finance needs to {{goal}} across all accounts in an Organization.',
    options: [
      { text: 'Email engineers asking them to tag resources consistently.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'No enforcement; will drift.' } },
      { text: 'Use AWS Organizations Tag Policies plus activated cost-allocation tags in the management account.', correct: true },
      { text: 'Manually parse the Cost & Usage Report in Excel each month.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'No prevention; reactive.' } },
      { text: 'Apply IAM policies that deny resource creation without tags, per account.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'IAM tag-condition works but Tag Policies are central.' } },
    ],
    explanation: 'Tag Policies enforce key/value structure org-wide; activating cost-allocation tags in the management account makes them appear as dimensions in Cost Explorer and the Cost & Usage Report.',
    maxVariants: 3,
  },

  {
    id: 'tpl-408',
    conceptSlug: 'cost-optimization-strategies',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      target: ['idle Elastic IPs', 'unattached EBS volumes', 'underutilised Reserved Instances'],
      org: ['a single account', 'an Organization with 50 accounts'],
    },
    stem: 'Surface {{target}} across {{org}} for cleanup with minimal effort.',
    options: [
      { text: 'Build a Lambda that loops every account and writes findings to S3.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Trusted Advisor org view.' } },
      { text: 'Use AWS Trusted Advisor cost-optimisation checks at the Organization level.', correct: true },
      { text: 'Manually inspect each region of each account.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Does not scale.' } },
      { text: 'Wait for the bill to spike and react.', correct: false, distractor: { type: 'monitoring-observability', explanation: 'Reactive, not preventive.' } },
    ],
    explanation: 'Trusted Advisor ships managed cost-optimisation checks (idle EIPs, unattached volumes, underutilised RIs, low-utilisation EC2). Org-level access (Business/Enterprise Support) gives a consolidated view.',
    maxVariants: 4,
  },

  {
    id: 'tpl-409',
    conceptSlug: 'storage-tier-decision-matrix',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      pattern: ['log files written daily and read mainly within 30 days', 'medical imaging accessed twice per year for 10 years', 'datasets accessed unpredictably with millisecond retrieval'],
    },
    stem: 'Pick the cheapest S3 storage tier that still meets the access pattern: {{pattern}}.',
    options: [
      { text: 'S3 Standard with no lifecycle.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Always-hot pricing wastes money on cold tail.' } },
      { text: 'Match the access pattern: lifecycle to Glacier Instant Retrieval for low-frequency-but-instant; Glacier Deep Archive for years-cold compliance; Intelligent-Tiering for unknown access.', correct: true },
      { text: 'Glacier Deep Archive for everything regardless of access pattern.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Breaks ms-retrieval requirements.' } },
      { text: 'S3 One Zone-IA for everything.', correct: false, distractor: { type: 'misses-durability-tier', explanation: 'Single-AZ; not for compliance datasets.' } },
    ],
    explanation: 'Glacier Instant Retrieval is the right tier for rarely-accessed data that still needs ms retrieval. Deep Archive is for compliance archives. Intelligent-Tiering is for unknown patterns. Standard for active.',
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

  {
    id: 'tpl-410',
    conceptSlug: 'ebs-cost-optimization',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      situation: ['gp2 volumes provisioned 5 years ago', 'high IOPS volumes that are over-provisioned', 'EBS snapshots that are no longer needed but kept for years'],
    },
    stem: 'Cut EBS storage spend caused by: {{situation}}.',
    options: [
      { text: 'Migrate to gp3 (cheaper, configurable IOPS/throughput); right-size with Compute Optimizer; lifecycle old snapshots via Data Lifecycle Manager.', correct: true },
      { text: 'Switch every volume to io2 Block Express for performance.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Premium tier; raises cost.' } },
      { text: 'Delete the volumes and rely on instance store only.', correct: false, distractor: { type: 'misses-durability-tier', explanation: 'Instance store is ephemeral.' } },
      { text: 'Detach the volumes and keep them unattached to save money.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Unattached EBS still bills for storage.' } },
    ],
    explanation: 'gp3 is ~20% cheaper than gp2 at equivalent performance and decouples IOPS/throughput from size. DLM automates snapshot lifecycle. Compute Optimizer flags over-provisioned volumes for right-sizing.',
    maxVariants: 3,
  },

  {
    id: 'tpl-411',
    conceptSlug: 'fargate-spot',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      workload: ['nightly batch jobs in containers', 'CI/CD build runners on ECS', 'a stateless API tier behind ALB'],
      cluster: ['ECS', 'EKS'],
    },
    stem: 'Cost-optimise {{workload}} running on {{cluster}}.',
    options: [
      { text: 'Run On-Demand Fargate at 100% capacity uniformly across all clusters.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'No discount applied; misses cheaper tiers.' } },
      { text: 'For ECS use Fargate Spot via Capacity Providers (mix On-Demand + Spot); for EKS use EC2 Spot in managed node groups (Fargate Spot is not supported on EKS).', correct: true },
      { text: 'Switch to long-running EC2 Reserved Instances regardless of workload.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Locks capacity; loses serverless benefit.' } },
      { text: 'Always run Fargate Spot regardless of stateful or stateless behaviour.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Spot can interrupt; stateful tiers break.' } },
    ],
    explanation: 'ECS Capacity Providers natively mix Fargate On-Demand and Fargate Spot for stateless interruption-tolerant work. EKS Fargate does not support Spot, but EKS managed node groups can use EC2 Spot for the same savings.',
    maxVariants: 6,
  },

  {
    id: 'tpl-412',
    conceptSlug: 'cost-optimization-strategies',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      profile: ['a development environment used 9-5 weekdays', 'a steady production workload running 24/7', 'a data pipeline that runs 4 hours a night'],
    },
    stem: 'Pick the cheapest compute pricing strategy for: {{profile}}.',
    options: [
      { text: 'Match: Instance Scheduler + On-Demand for dev; Compute Savings Plans for steady prod; Spot or Fargate Spot for fault-tolerant nightly jobs.', correct: true },
      { text: 'Spot only for every workload to chase the deepest discount.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Interruption breaks dev IDE sessions and SLA-bound prod.' } },
      { text: 'Reserved Instances 3-year all-upfront for the dev environment alone.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Locks capacity that idles 16h/day.' } },
      { text: 'On-Demand only for every workload to keep operations simple.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Leaves the largest discount lever unused.' } },
    ],
    explanation: 'Match the pricing model to the duty cycle: schedulable dev workloads use Instance Scheduler + On-Demand; steady prod uses Compute Savings Plans for cross-service flexibility; bursty/interruption-tolerant jobs use Spot.',
    maxVariants: 3,
  },

  {
    id: 'tpl-413',
    conceptSlug: 'aurora-performance',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      pattern: ['unpredictable bursty load with long idle gaps', 'predictable 24/7 read-heavy workload', 'a dev/test database used during business hours'],
    },
    stem: 'Most cost-effective Aurora topology for: {{pattern}}.',
    options: [
      { text: 'Match: Aurora Serverless v2 for bursty/idle and dev/test (auto-scales by ACU); provisioned Aurora with read replicas plus reserved capacity for steady 24/7 reads.', correct: true },
      { text: 'Use Aurora Serverless v2 uniformly for every Aurora deployment in the account.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Serverless on always-busy is more expensive than reserved.' } },
      { text: 'Provisioned Aurora with always-on On-Demand pricing for every database tier.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'No reservation discount; idle hours billed for dev.' } },
      { text: 'Migrate every Aurora workload to single-AZ RDS to maximise cost savings.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Loses Aurora durability and HA.' } },
    ],
    explanation: 'Aurora Serverless v2 idles cheaply and scales by ACU in seconds — ideal for bursty/idle. Steady 24/7 read-heavy workloads are cheapest on provisioned Aurora with reserved capacity plus read replicas.',
    maxVariants: 3,
  },

  {
    id: 'tpl-313',
    conceptSlug: 'kinesis-streams-vs-firehose',
    blueprintTaskId: '3.5',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.55,
    slots: {
      need: ['ingest 10 GB/s with custom consumers and replay', 'land streaming data in S3/Redshift with format conversion', 'stream and process with sub-second latency'],
    },
    stem: 'Pick the streaming primitive for: {{need}}.',
    options: [
      { text: 'Kinesis Data Streams for custom consumers and replay; Kinesis Data Firehose for managed delivery to S3/Redshift with format conversion.', correct: true },
      { text: 'SQS standard queue used as the high-throughput streaming pipeline.', correct: false, distractor: { type: 'sync-when-decoupled-needed', explanation: 'SQS is a queue, not an ordered stream.' } },
      { text: 'EventBridge bus used for every streaming-related ingestion need.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'EventBridge is event routing, not GB/s ingest.' } },
      { text: 'Self-managed Kafka brokers on EC2 with full operations.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'MSK or Kinesis are managed.' } },
    ],
    explanation: 'Data Streams gives shard-based ordered records with replay and custom consumers; Firehose adds managed delivery and format conversion (Parquet/ORC) into S3/Redshift/OpenSearch.',
    maxVariants: 3,
  },

  {
    id: 'tpl-314',
    conceptSlug: 'dynamodb-performance',
    blueprintTaskId: '3.3',
    patternTag: 'highest-throughput',
    difficulty: 0.55,
    slots: {
      pattern: ['hot partition causing throttling', 'read-heavy workload at 100k RPS', 'occasional bursts on otherwise low traffic'],
    },
    stem: 'Solve a DynamoDB performance issue: {{pattern}}.',
    options: [
      { text: 'Hot partition: re-design partition key for high-cardinality plus DAX; read-heavy: DAX cache and/or eventually-consistent reads; bursty: On-Demand capacity.', correct: true },
      { text: 'Switch every DynamoDB workload to provisioned capacity with low limits.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Bursty needs adaptive capacity.' } },
      { text: 'Use Global Tables to fix throttling problems on a single Region.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Replication is for HA, not throttling.' } },
      { text: 'Add a Lambda in front of DynamoDB to retry every operation forever.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'SDK already retries; does not fix root cause.' } },
    ],
    explanation: 'Hot partitions need cardinality engineering plus DAX caching. Read-heavy workloads benefit from DAX or eventually-consistent reads. Bursty workloads should use On-Demand capacity which auto-scales without operational tuning.',
    maxVariants: 3,
  },

  // ───── Wave 3: Push to 80% — D1 / D2 / D3 / D4 expansion ─────

  // D1 (Secure) — task 1.3 data security
  {
    id: 'tpl-110',
    conceptSlug: 'kms-encryption',
    blueprintTaskId: '1.3',
    patternTag: 'data-encryption',
    difficulty: 0.55,
    slots: {
      need: ['rotate keys yearly without re-encrypting data', 'centralize keys across 5 accounts', 'meet FIPS 140-2 Level 3 with single-tenant HSM', 'envelope-encrypt 1 GB objects with sub-ms overhead', 'enforce key usage to a specific Region only'],
    },
    stem: 'Pick the KMS key strategy to {{need}}.',
    options: [
      { text: 'Use AWS KMS customer-managed keys with automatic annual rotation, share key policies cross-account via grants, and CloudHSM for FIPS 140-2 Level 3 single-tenant.', correct: true },
      { text: 'Use AWS-owned keys for everything because they require zero management overhead.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'AWS-owned keys cannot be audited or shared cross-account.' } },
      { text: 'Hard-code AES-256 keys inside application source code and rotate manually each year.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Keys in source violate every compliance framework.' } },
      { text: 'Use a single KMS key in one account and grant IAM users wildcard kms:* permissions.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'No segregation; not compliant; not cross-account.' } },
    ],
    explanation: 'KMS CMKs support automatic annual rotation transparently (key material rotates, ciphertext stays valid). Cross-account access uses grants/key policies. CloudHSM is the FIPS 140-2 Level 3 single-tenant option when KMS Level 3 is insufficient.',
    maxVariants: 5,
  },

  {
    id: 'tpl-111',
    conceptSlug: 'secrets-manager',
    blueprintTaskId: '1.3',
    patternTag: 'data-encryption',
    difficulty: 0.5,
    slots: {
      target: ['RDS database credentials', 'a third-party API key', 'application config with secret values'],
    },
    stem: 'Securely store and rotate {{target}} with minimal code changes.',
    options: [
      { text: 'AWS Secrets Manager with automatic rotation Lambda and IAM-scoped retrieval at runtime.', correct: true },
      { text: 'Plain environment variables baked into the AMI at build time.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Secrets in AMIs leak via snapshots and image sharing.' } },
      { text: 'A private S3 bucket with the secret in a JSON file and bucket policy restrictions.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'No rotation, no audit, no integrated retrieval.' } },
      { text: 'Hard-code the value and rely on the security group to keep it private.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Network controls do not protect secrets in code.' } },
    ],
    explanation: 'Secrets Manager natively rotates RDS, Redshift, and DocumentDB credentials with managed rotation Lambdas, encrypts with KMS, and exposes IAM-scoped GetSecretValue at runtime. SSM Parameter Store SecureString is cheaper but lacks automated rotation.',
    maxVariants: 3,
  },

  {
    id: 'tpl-112',
    conceptSlug: 's3-object-lock',
    blueprintTaskId: '1.3',
    patternTag: 'compliance-immutable',
    difficulty: 0.6,
    slots: {
      mandate: ['SEC 17a-4 financial records WORM for 7 years', 'HIPAA audit logs immutable for 6 years', 'GDPR consent records that cannot be deleted before retention'],
    },
    stem: 'Achieve {{mandate}} on S3 objects.',
    options: [
      { text: 'S3 Object Lock in Compliance mode with retention period set per object, enabled at bucket creation.', correct: true },
      { text: 'A bucket policy denying s3:DeleteObject for IAM users.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Bucket policies are mutable; root can override.' } },
      { text: 'S3 Versioning alone with manual deletion procedures documented.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Versioning allows delete markers; not WORM.' } },
      { text: 'Glacier Vault Lock applied to a Standard S3 bucket through a lifecycle rule.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Vault Lock applies to Glacier vaults, not S3 buckets directly.' } },
    ],
    explanation: 'S3 Object Lock Compliance mode is true WORM — even root cannot shorten retention. Must be enabled at bucket creation. Governance mode allows privileged override; Compliance mode does not. Pairs with Versioning (auto-enabled).',
    maxVariants: 3,
  },

  {
    id: 'tpl-113',
    conceptSlug: 'macie',
    blueprintTaskId: '1.3',
    patternTag: 'data-encryption',
    difficulty: 0.55,
    slots: {
      goal: ['discover PII across hundreds of S3 buckets', 'detect publicly exposed sensitive data automatically', 'classify documents by sensitivity for compliance reporting'],
    },
    stem: 'Best service to {{goal}}.',
    options: [
      { text: 'Amazon Macie with managed data identifiers for PII, automatic discovery jobs, and EventBridge alerts on findings.', correct: true },
      { text: 'A custom Lambda that downloads each object and runs regex on the body.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Macie scales managed; custom code does not maintain identifiers.' } },
      { text: 'AWS Config rules that look at bucket policies for public access.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Config sees policies, not object content.' } },
      { text: 'GuardDuty findings filtered by severity with no S3 inspection.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'GuardDuty does threat detection, not data classification.' } },
    ],
    explanation: 'Macie is the managed PII/PHI discovery service for S3. It runs ML-driven managed data identifiers, surfaces public-exposure findings, and integrates with EventBridge/Security Hub. GuardDuty handles threat detection on logs, not object classification.',
    maxVariants: 3,
  },

  {
    id: 'tpl-114',
    conceptSlug: 'acm-certificate-manager',
    blueprintTaskId: '1.3',
    patternTag: 'data-encryption',
    difficulty: 0.45,
    slots: {
      use: ['public website on CloudFront', 'internal ALB serving private workloads', 'API Gateway custom domain with WAF'],
    },
    stem: 'TLS strategy for: {{use}}.',
    options: [
      { text: 'ACM public certificate (free, auto-renewing) for CloudFront/ALB/API Gateway; ACM Private CA for internal hostnames.', correct: true },
      { text: 'Buy commercial certificates and rotate them manually every year via SSH on each host.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'ACM auto-renews; manual rotation invites outage.' } },
      { text: 'Disable TLS termination and rely on VPC isolation as the security boundary.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'TLS in transit is non-negotiable for most frameworks.' } },
      { text: 'Use self-signed certificates baked into the AMI for everything.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Browsers reject self-signed; no public trust chain.' } },
    ],
    explanation: 'ACM provides free public certs auto-bound to CloudFront/ALB/API Gateway with auto-renewal. ACM Private CA issues internal certs (e.g., internal ALBs) with full lifecycle management. Self-signed and manually-managed certs lose the renewal SLA.',
    maxVariants: 3,
  },

  // D2 (Resilient) — tasks 2.1 and 2.2
  {
    id: 'tpl-212',
    conceptSlug: 'elasticache-redis-vs-memcached',
    blueprintTaskId: '2.1',
    patternTag: 'caching-strategy',
    difficulty: 0.55,
    slots: {
      need: ['cache hot DB rows with replication and sub-ms reads', 'session store with persistence and pub/sub', 'pure ephemeral cache with multi-threaded scale-out', 'leaderboard with sorted sets and atomic ops', 'rate-limiter counters with TTL'],
    },
    stem: 'Pick the ElastiCache engine for: {{need}}.',
    options: [
      { text: 'ElastiCache for Redis when persistence/replication/pub-sub are needed; Memcached when pure horizontal in-memory cache without replication is enough.', correct: true },
      { text: 'Always Memcached because it is simpler and faster for every workload.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'No replication, no persistence; loses session state on node failure.' } },
      { text: 'A self-managed Redis cluster on EC2 because ElastiCache lacks pub/sub.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'ElastiCache for Redis fully supports pub/sub and Cluster mode.' } },
      { text: 'DAX in front of an RDS database for session storage.', correct: false, distractor: { type: 'misuses-caching', explanation: 'DAX is a DynamoDB-only accelerator.' } },
    ],
    explanation: 'Redis brings replication, persistence, snapshots, pub/sub and Cluster mode for sharding — the right pick for sessions, leaderboards, and HA caches. Memcached is multi-threaded and shards by client, ideal for ephemeral caches that can lose data on node failure.',
    maxVariants: 5,
  },

  {
    id: 'tpl-213',
    conceptSlug: 'rds-proxy',
    blueprintTaskId: '2.1',
    patternTag: 'scalable-elastic',
    difficulty: 0.55,
    slots: {
      problem: ['Lambda functions exhausting RDS connections', 'spiky workloads triggering RDS connection-limit errors', 'failover latency causing application timeouts'],
    },
    stem: '{{problem}} — best fix?',
    options: [
      { text: 'Place RDS Proxy in front of the database — it pools and shares connections, drains gracefully on failover, and cuts failover time.', correct: true },
      { text: 'Increase the RDS instance size repeatedly to raise the max-connections setting.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Treats symptom; cost climbs without fixing connection storms.' } },
      { text: 'Have each Lambda invocation establish a new connection per request and close it.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Connection churn is the problem; not the fix.' } },
      { text: 'Put a Network Load Balancer in front of RDS to distribute connections.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'NLB does not pool DB connections.' } },
    ],
    explanation: 'RDS Proxy is a managed connection pooler designed for serverless and bursty workloads. It maintains a warm pool, multiplexes client connections, and reduces failover times by up to 66% by holding connections during DB transitions.',
    maxVariants: 3,
  },

  {
    id: 'tpl-214',
    conceptSlug: 'lambda-performance',
    blueprintTaskId: '2.1',
    patternTag: 'scalable-elastic',
    difficulty: 0.55,
    slots: {
      symptom: ['p99 cold-start latency spikes for user-facing API', 'unpredictable burst concurrency hitting account limits', 'memory-bound function running slower than expected'],
    },
    stem: 'Mitigate {{symptom}}.',
    options: [
      { text: 'Provisioned Concurrency for predictable cold-start; Reserved Concurrency for limit isolation; right-size memory (CPU scales with memory).', correct: true },
      { text: 'Move the workload to EC2 Auto Scaling because Lambda cannot meet latency.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Provisioned Concurrency closes the cold-start gap.' } },
      { text: 'Lower memory aggressively to save cost regardless of CPU starvation.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Lambda CPU scales with memory; under-sizing slows the function.' } },
      { text: 'Add a NAT Gateway in front of the Lambda to accelerate execution.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'NAT Gateway has nothing to do with Lambda performance.' } },
    ],
    explanation: 'Provisioned Concurrency keeps initialized environments warm (no cold start). Reserved Concurrency caps a function so it cannot starve siblings. Memory dictates CPU/network — under-sizing memory often produces "slow Lambda" symptoms.',
    maxVariants: 3,
  },

  {
    id: 'tpl-215',
    conceptSlug: 'step-functions',
    blueprintTaskId: '2.1',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.55,
    slots: {
      flow: ['multi-step ETL with retries and human approval', 'long-running saga across 6 microservices', 'parallel fan-out to 50 Lambdas with aggregation', 'video transcoding pipeline with 8 stages', 'order-fulfillment workflow with rollback compensation'],
    },
    stem: 'Best orchestration primitive for {{flow}}.',
    options: [
      { text: 'AWS Step Functions Standard for human approvals/long-running, Express for high-volume short flows, with built-in retry/catch and Map state for parallel fan-out.', correct: true },
      { text: 'A single monster Lambda with nested try/catch and inline waits.', correct: false, distractor: { type: 'over-engineers-solution', explanation: '15-min Lambda limit; brittle error handling.' } },
      { text: 'SQS queues chained with Lambda triggers and bash-style state in DynamoDB.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Step Functions without retries/visualization.' } },
      { text: 'EventBridge Pipes alone replacing Step Functions for everything.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'Pipes is event mesh, not workflow orchestration.' } },
    ],
    explanation: 'Step Functions is the workflow service: Standard mode supports up to 1-year executions (good for human approvals); Express mode runs millions of fast workflows. Map state fans out to Lambdas with concurrency control. Built-in retry/catch eliminates state-machine code.',
    maxVariants: 5,
  },

  {
    id: 'tpl-216',
    conceptSlug: 'eventbridge-pipes-schedules',
    blueprintTaskId: '2.1',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.5,
    slots: {
      need: ['point-to-point integration from SQS to Step Functions with filtering', 'cron job that fans out to 1000 schedules with one-time invocations', 'transform Kinesis records and route to multiple targets'],
    },
    stem: 'Best EventBridge feature for: {{need}}.',
    options: [
      { text: 'EventBridge Pipes for source-to-target with filter+enrich+transform; EventBridge Scheduler for one-time and cron at 1M+ schedules.', correct: true },
      { text: 'A custom Lambda + DynamoDB schedule table polled every minute by another Lambda.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Re-implements Scheduler poorly; no SLAs.' } },
      { text: 'An SQS queue with delay seconds capped at 15 minutes per message.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Delay queues are not a scheduler at scale.' } },
      { text: 'CloudWatch Alarms triggering on time of day with manual reset.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Alarms are not a scheduling primitive.' } },
    ],
    explanation: 'EventBridge Pipes connects sources (SQS/Kinesis/DynamoDB Streams) to targets with optional filter/enrich/transform — a managed glue replacing custom Lambda forwarders. EventBridge Scheduler scales to 1M+ schedules, supports one-time and cron, and is the modern replacement for CloudWatch scheduled rules.',
    maxVariants: 3,
  },

  {
    id: 'tpl-217',
    conceptSlug: 'appsync-graphql',
    blueprintTaskId: '2.1',
    patternTag: 'serverless-vs-container',
    difficulty: 0.5,
    slots: {
      need: ['real-time mobile app with subscriptions on data changes', 'GraphQL API aggregating DynamoDB plus a REST backend', 'offline-first mobile sync with conflict resolution'],
    },
    stem: 'Pick the API layer for: {{need}}.',
    options: [
      { text: 'AWS AppSync (GraphQL) with managed subscriptions over WebSockets, multiple data sources, and DataStore for offline sync.', correct: true },
      { text: 'API Gateway REST with long-poll endpoints and a custom WebSocket Lambda.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Reinvents AppSync subscriptions and DataStore.' } },
      { text: 'Run an EC2 fleet with self-managed GraphQL servers behind ALB.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Operational overhead vs managed AppSync.' } },
      { text: 'CloudFront only with lambda@edge as the GraphQL engine.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'Edge is not a GraphQL runtime.' } },
    ],
    explanation: 'AppSync is the managed GraphQL service: real-time subscriptions, multi-source resolvers (DynamoDB, Lambda, RDS, HTTP), and Amplify DataStore for offline-first mobile/web with automatic conflict resolution.',
    maxVariants: 3,
  },

  {
    id: 'tpl-218',
    conceptSlug: 'route53-routing',
    blueprintTaskId: '2.2',
    patternTag: 'highest-availability',
    difficulty: 0.55,
    slots: {
      goal: ['route users to nearest healthy Region', 'gradual blue/green migration with traffic split', 'failover from primary to DR Region on health check failure', 'comply with data-residency rules per country', 'DNS-level load balancing across many endpoints'],
    },
    stem: 'Route 53 routing policy for: {{goal}}.',
    options: [
      { text: 'Latency-based for nearest Region, Weighted for traffic split, Failover for primary/DR — all paired with health checks.', correct: true },
      { text: 'Simple routing with a single record and DNS TTL of 60 seconds.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'No multi-Region, no health checks.' } },
      { text: 'A single ALB serving all Regions through cross-Region target groups.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'ALB target groups are Region-scoped.' } },
      { text: 'Geolocation routing for everything because it is the most accurate.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Geolocation does not equal latency-best Region.' } },
    ],
    explanation: 'Route 53 has a routing policy per use case: Latency for nearest, Weighted for canary/blue-green, Failover with health checks for active-passive, Geolocation/Geoproximity for compliance steering, Multivalue for DNS-level load balancing.',
    maxVariants: 5,
  },

  {
    id: 'tpl-219',
    conceptSlug: 'aurora-global',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.6,
    slots: {
      target: ['RPO under 1 second cross-Region with sub-minute RTO', 'low-latency reads in 5 Regions globally', 'compliance-mandated cross-Region failover under 60 seconds'],
    },
    stem: 'Database for: {{target}}.',
    options: [
      { text: 'Aurora Global Database — typical sub-second cross-Region replication, managed unplanned failover, up to 5 secondary Regions for low-latency reads.', correct: true },
      { text: 'RDS Multi-AZ alone (Single Region).', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Multi-AZ is intra-Region only.' } },
      { text: 'Bin-log replication scripted by EC2 cron jobs across Regions.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Aurora Global Database is the managed answer.' } },
      { text: 'DynamoDB Global Tables for a relational workload requiring SQL joins.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'NoSQL does not satisfy relational semantics.' } },
    ],
    explanation: 'Aurora Global Database streams from primary to up to 5 secondary Regions with typical <1s lag, managed cross-Region failover (under a minute), and read scaling globally — the answer for cross-Region RPO/RTO with relational requirements.',
    maxVariants: 3,
  },

  {
    id: 'tpl-220',
    conceptSlug: 'dynamodb-resilience',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.55,
    slots: {
      need: ['active-active across 3 Regions with eventual consistency', 'point-in-time recovery for accidental writes', 'continuous backups with on-demand restore'],
    },
    stem: 'DynamoDB resilience feature for: {{need}}.',
    options: [
      { text: 'Global Tables for active-active multi-Region, PITR for last 35 days, On-Demand Backup for long-term archive — all native managed features.', correct: true },
      { text: 'Self-managed snapshot scripts pushing dumps to S3 hourly.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'PITR/Backup are native.' } },
      { text: 'Aurora Global Database for DynamoDB workloads.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Aurora is relational, not NoSQL.' } },
      { text: 'A single Region with a Lambda copying items to S3 every minute.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'No active-active; reinvents PITR poorly.' } },
    ],
    explanation: 'DynamoDB Global Tables provide active-active multi-Region with last-writer-wins eventual consistency. PITR offers continuous backup for the last 35 days. On-Demand Backup is for long-term retention and cross-account snapshots.',
    maxVariants: 3,
  },

  {
    id: 'tpl-221',
    conceptSlug: 'aws-backup',
    blueprintTaskId: '2.2',
    patternTag: 'dr-rpo-rto',
    difficulty: 0.5,
    slots: {
      scope: ['EC2, RDS, EFS, DynamoDB centrally with one policy', 'cross-account vaulting for ransomware isolation', 'cross-Region copy of backups for DR'],
    },
    stem: 'Centralized backup approach for: {{scope}}.',
    options: [
      { text: 'AWS Backup with backup plans, cross-account/cross-Region vault copies, and Vault Lock to harden against ransomware.', correct: true },
      { text: 'Per-service snapshot scripts in each account with no central policy.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Hard to govern; no compliance reporting.' } },
      { text: 'Replicate every resource to S3 manually with custom Lambdas.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Reinvents AWS Backup poorly.' } },
      { text: 'Disable backups to save cost and rely on Multi-AZ as the DR plan.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'Multi-AZ is not a backup; protects against AZ failure only.' } },
    ],
    explanation: 'AWS Backup centralizes backup policy across services (EC2, RDS, EFS, DynamoDB, FSx, etc.) with backup plans, cross-account/Region vault copies, Vault Lock (compliance WORM) and audit reports for compliance frameworks.',
    maxVariants: 3,
  },

  // D3 (Performant) — tasks 3.1 - 3.5
  {
    id: 'tpl-315',
    conceptSlug: 's3-lifecycle',
    blueprintTaskId: '3.1',
    patternTag: 'storage-tier-selection',
    difficulty: 0.5,
    slots: {
      profile: ['logs accessed for 30 days then archived 7 years', 'media files unused after 90 days but occasionally retrieved', 'temp data deleted after 7 days'],
    },
    stem: 'Define an S3 lifecycle policy for: {{profile}}.',
    options: [
      { text: 'Lifecycle rule: transition to Standard-IA after 30 days, Glacier after 90, Glacier Deep Archive after 365, Expire on retention end.', correct: true },
      { text: 'Keep everything in S3 Standard forever to avoid retrieval costs.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Cold data in Standard wastes 90%+ of the bill.' } },
      { text: 'Manual job that lists every object monthly and tags it for migration.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Native lifecycle is the managed answer.' } },
      { text: 'Move everything to Glacier Deep Archive on day 1 to maximize savings.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: '12-hour retrieval breaks the access window.' } },
    ],
    explanation: 'S3 Lifecycle automates transitions through tiers based on age. Combine with Standard-IA (30+ days warm), Glacier Flexible (90+ days), Deep Archive (1+ year) and an Expiration action for end-of-life. Lifecycle is managed; manual migration loses that.',
    maxVariants: 3,
  },

  {
    id: 'tpl-316',
    conceptSlug: 'storage-gateway',
    blueprintTaskId: '3.1',
    patternTag: 'migrate-minimal-disruption',
    difficulty: 0.55,
    slots: {
      need: ['extend on-prem NFS to S3 transparently', 'replace LTO tape backups with cloud-backed VTL', 'cache frequently-accessed files locally with cloud as source of truth'],
    },
    stem: 'Storage Gateway flavor for: {{need}}.',
    options: [
      { text: 'File Gateway for NFS/SMB to S3, Tape Gateway as VTL replacing LTO, Volume/File-Cached for local cache backed by cloud.', correct: true },
      { text: 'Snowball Edge cluster as a permanent on-prem NFS appliance.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Snow is bulk transfer, not steady-state gateway.' } },
      { text: 'DataSync running every minute as a synchronous gateway.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'DataSync is bulk transfer, not gateway.' } },
      { text: 'Direct Connect with a custom Samba server in AWS.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Storage Gateway is the managed primitive.' } },
    ],
    explanation: 'Storage Gateway has three modes for hybrid integration: File Gateway (NFS/SMB → S3), Tape Gateway (iSCSI VTL → S3/Glacier), and Volume Gateway (cached or stored). Each one targets a specific on-prem-to-cloud bridge — DataSync and Snow are bulk transfer.',
    maxVariants: 3,
  },

  {
    id: 'tpl-317',
    conceptSlug: 'spot-fleet-strategies',
    blueprintTaskId: '3.2',
    patternTag: 'scalable-elastic',
    difficulty: 0.55,
    slots: {
      job: ['fault-tolerant batch render farm', 'CI workers with flexible deadlines', 'big-data ETL with checkpoints'],
    },
    stem: 'Spot strategy for: {{job}}.',
    options: [
      { text: 'EC2 Spot Fleet with capacity-optimized allocation across many instance families and AZs, with checkpointing for interruptions.', correct: true },
      { text: 'Pure On-Demand instances for everything to guarantee capacity.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: '4–9× more expensive than Spot for fault-tolerant batch.' } },
      { text: 'A single instance type in one AZ to keep things simple.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Single Spot pool spikes interruption risk.' } },
      { text: 'Reserved Instances for transient batch jobs.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'RI commitment vs transient workloads is wrong fit.' } },
    ],
    explanation: 'For fault-tolerant batch workloads, Spot Fleet (or EC2 Fleet) with capacity-optimized allocation diversified across instance types and AZs minimizes interruptions. Application-level checkpointing turns interruptions into restartable work — yielding ~70% savings vs On-Demand.',
    maxVariants: 3,
  },

  {
    id: 'tpl-318',
    conceptSlug: 'global-accelerator',
    blueprintTaskId: '3.4',
    patternTag: 'lowest-latency',
    difficulty: 0.6,
    slots: {
      goal: ['static anycast IPs with multi-Region failover under 30 seconds', 'gaming workload needing UDP at low jitter globally', 'IoT fleet needing fixed entry IPs through corporate firewalls'],
    },
    stem: 'Best edge fronting for: {{goal}}.',
    options: [
      { text: 'AWS Global Accelerator — two anycast IPs, AWS backbone for low jitter, sub-30s health-driven failover, supports TCP/UDP.', correct: true },
      { text: 'CloudFront for everything because edge caching equals lower latency.', correct: false, distractor: { type: 'misuses-caching', explanation: 'CloudFront is HTTP/S CDN; no UDP, no static IPs.' } },
      { text: 'Route 53 latency-based routing without static IPs.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'DNS TTL means slower failover; no fixed IPs for firewall allowlists.' } },
      { text: 'Public Application Load Balancer with multi-Region target groups.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'ALBs are Region-scoped; no anycast.' } },
    ],
    explanation: 'Global Accelerator is the AWS anycast-IP edge: two static IPs, traffic on the AWS backbone (lower jitter), TCP+UDP support, and sub-30-second failover via active health checks. CloudFront is the HTTP cache; Route 53 has DNS-TTL failover only.',
    maxVariants: 3,
  },

  {
    id: 'tpl-319',
    conceptSlug: 'cloudfront-security',
    blueprintTaskId: '3.4',
    patternTag: 'most-secure',
    difficulty: 0.55,
    slots: {
      need: ['serve private S3 content only via the CDN', 'rate-limit and block OWASP top-10 attacks at the edge', 'enforce TLS 1.2 minimum and modern ciphers globally'],
    },
    stem: 'CloudFront security feature for: {{need}}.',
    options: [
      { text: 'Origin Access Control to lock S3 to CloudFront, AWS WAF on the distribution for OWASP/rate-limit, security policy enforcing TLSv1.2_2021.', correct: true },
      { text: 'Public S3 bucket with signed URLs generated by every client.', correct: false, distractor: { type: 'public-when-private-needed', explanation: 'Public bucket leaks the origin; OAC fixes this.' } },
      { text: 'Security groups attached directly to the CloudFront distribution.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'CloudFront is global; no SG attachment.' } },
      { text: 'Custom Lambda@Edge that re-implements WAF rules.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'WAF managed rule groups are the answer.' } },
    ],
    explanation: 'CloudFront pairs with: Origin Access Control (or legacy OAI) for S3, AWS WAF (managed rule groups + rate-based rules) for Layer 7, and security policies that pin TLS minimum and cipher suites. Together they provide defense-in-depth at the CDN edge.',
    maxVariants: 3,
  },

  {
    id: 'tpl-320',
    conceptSlug: 'lambda-edge-vs-cloudfront-functions',
    blueprintTaskId: '3.4',
    patternTag: 'lowest-latency',
    difficulty: 0.6,
    slots: {
      logic: ['header rewrite on every viewer request at sub-millisecond latency', 'dynamic content fetch from a third-party API at the edge', 'A/B test cookie-based variant selection at viewer-request'],
    },
    stem: 'Edge compute for: {{logic}}.',
    options: [
      { text: 'CloudFront Functions for ultra-low-latency viewer-request/response (header rewrite, A/B); Lambda@Edge for richer logic with network/IO calls.', correct: true },
      { text: 'Lambda@Edge for every edge function regardless of latency budget.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'CloudFront Functions is faster and cheaper for simple JS.' } },
      { text: 'A regional Lambda invoked from CloudFront for each viewer request.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Round-trip to Region defeats the point.' } },
      { text: 'API Gateway in front of CloudFront for header logic.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'API Gateway is regional; not edge.' } },
    ],
    explanation: 'CloudFront Functions runs JS at every CloudFront edge in <1ms — perfect for header manipulation, redirects, A/B tests. Lambda@Edge runs Node.js/Python with network access (e.g., DynamoDB calls) at viewer/origin events but with higher cold-start and cost.',
    maxVariants: 3,
  },

  {
    id: 'tpl-321',
    conceptSlug: 'redshift-fundamentals',
    blueprintTaskId: '3.5',
    patternTag: 'highest-throughput',
    difficulty: 0.55,
    slots: {
      need: ['petabyte data warehouse with concurrent BI users', 'federated query into S3 data lake without copying', 'auto-scale during month-end report runs', 'separate compute from storage for cost flexibility', 'serverless analytics with no capacity management'],
    },
    stem: 'Redshift feature for: {{need}}.',
    options: [
      { text: 'RA3 nodes (managed storage), Redshift Spectrum for federated S3 query, Concurrency Scaling and Serverless for spikes.', correct: true },
      { text: 'A self-managed PostgreSQL cluster on EC2 with manual sharding.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Redshift is the managed columnar warehouse.' } },
      { text: 'DynamoDB with adaptive capacity for analytics SQL workloads.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'NoSQL key-value vs columnar OLAP.' } },
      { text: 'Aurora MySQL with read replicas as a warehouse.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'OLTP engine; not columnar.' } },
    ],
    explanation: 'Redshift RA3 separates compute from managed storage (scale independently). Spectrum runs SQL directly on S3. Concurrency Scaling spins transient clusters for read bursts; Redshift Serverless removes capacity management entirely.',
    maxVariants: 5,
  },

  {
    id: 'tpl-322',
    conceptSlug: 'glue-catalog-etl',
    blueprintTaskId: '3.5',
    patternTag: 'least-operational-overhead',
    difficulty: 0.55,
    slots: {
      job: ['serverless ETL of 1 TB/day from S3 to S3 in Parquet', 'crawl multiple S3 buckets to populate an Athena catalog', 'streaming ETL of Kinesis records with schema evolution'],
    },
    stem: 'Best Glue feature for: {{job}}.',
    options: [
      { text: 'Glue Jobs (Spark) for batch ETL, Crawlers for catalog auto-discovery, Streaming Jobs for Kinesis with schema-registry support.', correct: true },
      { text: 'EMR cluster of 50 nodes provisioned 24/7 for nightly ETL.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Glue is serverless; pay per DPU-hour.' } },
      { text: 'A custom Python script on a t3.micro reading S3 sequentially.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'No parallelism; not the AWS-native answer.' } },
      { text: 'Athena CTAS as the only ETL primitive across the pipeline.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'CTAS is great as a step but lacks orchestration and crawl.' } },
    ],
    explanation: 'AWS Glue is the serverless ETL/catalog: Glue Jobs run Spark (or Python shell), Crawlers populate the Data Catalog automatically, Streaming Jobs handle Kinesis, and the catalog is the metadata source for Athena/Redshift Spectrum/EMR.',
    maxVariants: 3,
  },

  {
    id: 'tpl-323',
    conceptSlug: 'athena-fundamentals',
    blueprintTaskId: '3.5',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      goal: ['ad-hoc SQL on S3 logs without provisioning', 'query CloudTrail/VPC Flow Logs at petabyte scale', 'BI dashboards reading partitioned Parquet'],
    },
    stem: 'Best fit for: {{goal}}.',
    options: [
      { text: 'Amazon Athena (serverless presto) on partitioned Parquet, with workgroups for cost control and CTAS for materialized results.', correct: true },
      { text: 'A Redshift cluster running 24/7 for occasional ad-hoc queries.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Pay-per-cluster-hour wastes money for ad-hoc.' } },
      { text: 'Manual S3 Select with parsing scripts on EC2.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'No SQL planner; no joins.' } },
      { text: 'EMR cluster scripted by SSH for every query.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Athena is the serverless option.' } },
    ],
    explanation: 'Athena is the serverless SQL-on-S3 service. Pay per TB scanned. Partitioning + Parquet/ORC compression slashes scan costs by 90%+. Workgroups enforce per-team cost controls. CTAS creates materialized results for repeated queries.',
    maxVariants: 3,
  },

  {
    id: 'tpl-324',
    conceptSlug: 'lake-formation-governance',
    blueprintTaskId: '3.5',
    patternTag: 'most-secure',
    difficulty: 0.6,
    slots: {
      goal: ['column-level access control on a shared data lake', 'cross-account data sharing with central governance', 'tag-based access policies across many catalog tables'],
    },
    stem: 'Lake Formation feature for: {{goal}}.',
    options: [
      { text: 'Lake Formation fine-grained permissions (database/table/column/row), LF-Tags for tag-based control, and cross-account grants on the shared catalog.', correct: true },
      { text: 'Hand-crafted bucket policies on every S3 prefix per user.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Does not scale; no row/column control.' } },
      { text: 'Restrict every analyst to a single S3 prefix and copy data manually.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Lake Formation is the central governance plane.' } },
      { text: 'Athena workgroups alone for table-level access enforcement.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'Workgroups gate queries, not row/column visibility.' } },
    ],
    explanation: 'Lake Formation centralizes data-lake security on top of the Glue catalog: database/table/column/row permissions, LF-Tags for ABAC, cross-account grants, and audit. Replaces IAM-only S3-policy patterns that cannot do column-level control.',
    maxVariants: 3,
  },

  // D4 (Cost) — tasks 4.1 - 4.4
  {
    id: 'tpl-414',
    conceptSlug: 'storage-tier-decision-matrix',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      access: ['unknown access pattern with frequent and infrequent objects mixed', 'predictable warm tier accessed monthly', 'long-term archive retrieved once a year'],
    },
    stem: 'Cheapest correct S3 tier for: {{access}}.',
    options: [
      { text: 'Intelligent-Tiering for unknown patterns; Standard-IA for predictable warm; Glacier Deep Archive for cold archive — match tier to access shape.', correct: true },
      { text: 'S3 Standard for everything to keep things simple.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Most expensive tier; wastes money on cold data.' } },
      { text: 'Glacier Flexible Retrieval for unknown access (cheapest tier).', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Retrieval fees plus latency; bad fit for unknown.' } },
      { text: 'Reduced Redundancy Storage class for new buckets.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'RRS is deprecated and not the answer.' } },
    ],
    explanation: 'Intelligent-Tiering auto-moves objects between Frequent/Infrequent/Archive Instant based on access — perfect when patterns are unknown. Standard-IA is cheaper than Standard for predictable warm. Glacier Deep Archive is the bottom of the cost stack for cold archive (12-hour retrieval).',
    maxVariants: 3,
  },

  {
    id: 'tpl-415',
    conceptSlug: 's3-intelligent-tiering',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      pattern: ['data lake with unpredictable analyst access', 'image archive accessed sporadically by users', 'log bucket with mixed hot/cold objects'],
    },
    stem: 'For {{pattern}}, cheapest hands-off storage choice?',
    options: [
      { text: 'S3 Intelligent-Tiering — automatic per-object tiering between Frequent/Infrequent/Archive Instant with no retrieval fees.', correct: true },
      { text: 'S3 Standard with manual lifecycle rules tuned per-object.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Intelligent-Tiering automates the decision.' } },
      { text: 'Glacier Flexible Retrieval as the default for everything.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Retrieval fees and minutes-to-hours latency hurt mixed access.' } },
      { text: 'Self-built Lambda that moves objects nightly based on access logs.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Intelligent-Tiering.' } },
    ],
    explanation: 'Intelligent-Tiering charges a small per-object monitoring fee and automatically moves objects across Frequent/Infrequent/Archive Instant tiers. No retrieval fees on Frequent/Infrequent. Optional Archive/Deep Archive tiers for true cold data.',
    maxVariants: 3,
  },

  {
    id: 'tpl-416',
    conceptSlug: 'savings-plans-strategy',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      profile: ['steady EC2 baseline with mix of families and Regions', 'Fargate and Lambda baseline alongside EC2', 'short-term commit with high flexibility', 'high-utilization stable production fleet', 'gradual ramp-up of new workloads over 12 months'],
    },
    stem: 'Best Savings Plan for: {{profile}}.',
    options: [
      { text: 'Compute Savings Plans for cross-family/Region/Fargate/Lambda flexibility; EC2 Instance Savings Plans when committed to a family in a Region for deeper discount.', correct: true },
      { text: 'Standard 3-year all-upfront EC2 RIs locking each instance type/AZ.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'No flexibility across families/Regions.' } },
      { text: 'Spot Instances exclusively to skip every commitment.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Spot does not cover steady baseline.' } },
      { text: 'On-Demand only — no commitment is the cheapest option.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'On-Demand is the most expensive baseline option.' } },
    ],
    explanation: 'Compute Savings Plans (up to 66% off) cover EC2/Fargate/Lambda across families/Regions/OS — maximal flexibility. EC2 Instance Savings Plans (up to 72% off) require commitment to family-in-Region but offer deeper discount. RIs still exist for RDS/Redshift/ElastiCache.',
    maxVariants: 5,
  },

  {
    id: 'tpl-417',
    conceptSlug: 'compute-optimizer',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      goal: ['identify over-provisioned EC2 instances', 'right-size Lambda memory based on real usage', 'find idle EBS volumes consuming cost'],
    },
    stem: 'Service to: {{goal}}.',
    options: [
      { text: 'AWS Compute Optimizer — ML-driven recommendations for EC2/EBS/Lambda/ASG using CloudWatch metrics history.', correct: true },
      { text: 'Manual review of CloudWatch graphs every quarter.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Compute Optimizer automates this.' } },
      { text: 'Trusted Advisor cost checks alone (no per-resource recommendations).', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'TA gives summary, not Compute-Optimizer-grade ML right-sizing.' } },
      { text: 'Cost Explorer rightsizing recommendations only for EC2 of size t3.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Cost Explorer has rightsizing too but Optimizer is broader and ML-driven.' } },
    ],
    explanation: 'Compute Optimizer uses ML on 14 days+ of CloudWatch metrics to recommend right-sizing for EC2, EBS, Lambda, ASG, ECS-on-Fargate. Output includes risk and projected savings — the dedicated rightsizing service.',
    maxVariants: 3,
  },

  {
    id: 'tpl-418',
    conceptSlug: 'aurora-performance',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      profile: ['unpredictable spiky workload with idle periods', 'dev/test environments running ad-hoc', 'steady-state OLTP with predictable peak'],
    },
    stem: 'Cheapest correct Aurora option for: {{profile}}.',
    options: [
      { text: 'Aurora Serverless v2 for spiky/unpredictable; Aurora provisioned with stop/start for dev/test; provisioned + RIs for steady-state.', correct: true },
      { text: 'Always provisioned db.r6g.16xlarge regardless of load shape.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Massive overprovisioning for spiky workloads.' } },
      { text: 'RDS MySQL Single-AZ with no scaling for everything.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Wrong engine and no HA.' } },
      { text: 'DynamoDB On-Demand replacing every Aurora workload.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Relational requirements rule out NoSQL.' } },
    ],
    explanation: 'Aurora Serverless v2 scales ACUs (0.5–128) in 0.5-step increments tracking load — best for spiky/unpredictable. Aurora provisioned can stop/start for dev/test (saves compute). Steady-state benefits from provisioned + Reserved Instances for the deepest discount.',
    maxVariants: 3,
  },

  {
    id: 'tpl-419',
    conceptSlug: 'vpc-endpoints',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      traffic: ['large S3 traffic from private subnets crossing NAT Gateway', 'DynamoDB traffic from private subnets', 'API calls to many AWS services from private subnets'],
    },
    stem: 'Cut NAT Gateway cost for: {{traffic}}.',
    options: [
      { text: 'Gateway Endpoints (free) for S3 and DynamoDB; Interface Endpoints (PrivateLink, hourly+per-GB) for other AWS services to bypass NAT.', correct: true },
      { text: 'Add more NAT Gateways across AZs to scale throughput.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Increases cost; does not avoid the per-GB charge.' } },
      { text: 'Move private subnets to public subnets and skip NAT entirely.', correct: false, distractor: { type: 'public-when-private-needed', explanation: 'Breaks security posture.' } },
      { text: 'Direct Connect from on-prem to S3 to bypass NAT.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'NAT issue is intra-VPC, not on-prem.' } },
    ],
    explanation: 'NAT Gateway charges hourly + per-GB processed. Gateway VPC Endpoints (S3, DynamoDB) are free and route via private routing tables. Interface Endpoints (PrivateLink) cost an hourly + per-GB but are typically cheaper than NAT for AWS-service traffic.',
    maxVariants: 3,
  },

  {
    id: 'tpl-420',
    conceptSlug: 'aws-budgets-cost-explorer',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.45,
    slots: {
      goal: ['alert when monthly spend exceeds threshold per team', 'identify the top cost drivers across services', 'forecast next-quarter spend by linked account'],
    },
    stem: 'Best AWS-native tool for: {{goal}}.',
    options: [
      { text: 'AWS Budgets for thresholds and alerts; Cost Explorer for breakdowns and forecasting; CUR with Athena for deep custom analysis.', correct: true },
      { text: 'A custom Lambda hitting the Cost API every hour and emailing reports.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Budgets/Cost Explorer cover this natively.' } },
      { text: 'CloudWatch billing alarms only, with no service breakdown.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Budgets adds richer thresholds; Cost Explorer adds breakdown.' } },
      { text: 'Trusted Advisor as the sole cost monitoring tool.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'TA gives recommendations, not budgeting/forecasting.' } },
    ],
    explanation: 'AWS Budgets sets cost/usage thresholds with alerts (email/SNS), Cost Explorer provides interactive breakdowns and forecasts, and Cost & Usage Reports (CUR) export billing data to S3 for Athena/QuickSight analysis — the native cost-management trio.',
    maxVariants: 3,
  },

  // Wave 4 — final push to 80%
  {
    id: 'tpl-115',
    conceptSlug: 'iam-permissions-boundaries',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.6,
    slots: {
      scenario: ['delegate IAM admin to a team without privilege escalation', 'cap a service-linked role to a maximum permission set', 'enforce that developers can create roles only within an allowlist'],
    },
    stem: 'Best IAM control for: {{scenario}}.',
    options: [
      { text: 'Permissions Boundaries — set the maximum effective permissions a user/role can have, regardless of attached policies.', correct: true },
      { text: 'Service Control Policies attached at the OU level for individual user permissions.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'SCPs apply to accounts, not individual identities.' } },
      { text: 'Wildcard IAM policy with explicit Deny on a few risky actions.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Cannot enumerate every risky action.' } },
      { text: 'IAM groups alone with manual review of policy attachments.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Groups apply policies; do not cap them.' } },
    ],
    explanation: 'Permissions Boundaries are the IAM feature that caps the maximum permissions an identity can have. Used for delegated administration: the boundary policy enforces the upper bound, so delegated admins cannot escalate privilege beyond the boundary.',
    maxVariants: 4,
  },

  {
    id: 'tpl-116',
    conceptSlug: 'iam-access-analyzer',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.55,
    slots: {
      goal: ['detect cross-account or public exposure of S3/IAM/SQS', 'validate IAM policies before deploying', 'continuously monitor for unintended external access'],
    },
    stem: 'Best AWS-native tool for: {{goal}}.',
    options: [
      { text: 'IAM Access Analyzer — continuous external-access analysis, policy validation, and unused-access findings across resource types.', correct: true },
      { text: 'CloudTrail dashboard alone with manual log review.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'CloudTrail records events; Access Analyzer reasons about policy reachability.' } },
      { text: 'GuardDuty findings in default mode without IAM integration.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'GuardDuty is threat detection; Access Analyzer is reachability/exposure.' } },
      { text: 'Custom Lambda parsing every bucket policy nightly.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Access Analyzer.' } },
    ],
    explanation: 'IAM Access Analyzer uses formal policy reasoning to detect cross-account and public exposure across S3, IAM roles, KMS keys, Lambda, SQS, Secrets Manager, and others. Also offers policy validation (in code review) and unused-access findings to remove stale permissions.',
    maxVariants: 4,
  },

  {
    id: 'tpl-322b',
    conceptSlug: 'security-hub',
    blueprintTaskId: '1.2',
    patternTag: 'monitoring-observability',
    difficulty: 0.55,
    slots: {
      goal: ['centralize security findings across all accounts', 'continuously check CIS/NIST/PCI controls', 'aggregate GuardDuty/Inspector/Macie findings in one place'],
    },
    stem: 'Best AWS service for: {{goal}}.',
    options: [
      { text: 'AWS Security Hub — multi-account aggregator with automated CIS/NIST/PCI standards checks and integrated findings from GuardDuty/Inspector/Macie.', correct: true },
      { text: 'A custom dashboard built on raw CloudTrail events.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reinvents Security Hub poorly.' } },
      { text: 'Trusted Advisor cost checks alone.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'TA is recommendations, not findings aggregation.' } },
      { text: 'Config rules with no central collector.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Config alone lacks compliance scoring and finding aggregation.' } },
    ],
    explanation: 'Security Hub is the AWS findings aggregator: pulls from GuardDuty (threats), Inspector (vulnerabilities), Macie (data classification), Config (compliance) plus partner integrations, and runs continuous CIS/NIST/PCI checks with severity scoring and cross-account aggregation.',
    maxVariants: 4,
  },

  {
    id: 'tpl-323b',
    conceptSlug: 'guardduty',
    blueprintTaskId: '1.2',
    patternTag: 'monitoring-observability',
    difficulty: 0.55,
    slots: {
      threat: ['unusual API calls indicating compromised credentials', 'EC2 instance communicating with known C2 servers', 'cryptomining behavior on EKS workloads'],
    },
    stem: 'Detect {{threat}} — best service?',
    options: [
      { text: 'Amazon GuardDuty with EKS Protection and S3 Protection enabled — managed threat detection on CloudTrail/VPC Flow/DNS/EKS audit logs.', correct: true },
      { text: 'AWS Config rules with custom Lambda evaluators.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'Config evaluates configuration drift, not behavior.' } },
      { text: 'Manual log review by a security analyst weekly.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Behavioral anomalies need ML at AWS scale.' } },
      { text: 'AWS WAF rules covering API-call anomalies.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'WAF inspects HTTP requests, not control-plane events.' } },
    ],
    explanation: 'GuardDuty is the managed threat-detection service. It uses ML/threat-intel on CloudTrail (control plane), VPC Flow Logs and DNS (network plane), plus EKS audit logs (EKS Protection) and S3 data events (S3 Protection). Findings flow to Security Hub/EventBridge.',
    maxVariants: 4,
  },

  {
    id: 'tpl-419b',
    conceptSlug: 'site-to-site-vpn-vs-client-vpn',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.55,
    slots: {
      need: ['burst-capacity hybrid for occasional 100 Mbps traffic', 'dedicated 10 Gbps with predictable latency for 5 years', 'remote workforce VPN for 500 engineers'],
    },
    stem: 'Cheapest correct connectivity for: {{need}}.',
    options: [
      { text: 'Site-to-Site VPN for occasional bursts (no port fees), Direct Connect 10 Gbps + DX Gateway for steady-state, AWS Client VPN for remote users.', correct: true },
      { text: 'Direct Connect 10 Gbps for every connectivity scenario regardless of usage.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Massive overspend for occasional bursts and remote users.' } },
      { text: 'Public internet only with no VPN encryption to save cost.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Unencrypted traffic violates most baselines.' } },
      { text: 'A NAT Gateway in each AZ acting as the on-prem connector.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'NAT GW is for egress, not site-to-site.' } },
    ],
    explanation: 'Site-to-Site VPN is cheap for occasional/bursty hybrid traffic. Direct Connect (1/10/100 Gbps) wins for steady, high-bandwidth, predictable-latency hybrid; pair with DX Gateway for multi-Region/account. AWS Client VPN is the managed OpenVPN-compatible service for remote workforce.',
    maxVariants: 4,
  },

  // ───── Wave 5: final push to 100% ─────

  // D1.1 — secure access
  {
    id: 'tpl-117',
    conceptSlug: 'iam-fundamentals',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.5,
    slots: {
      need: ['EC2 instance reading from S3', 'Lambda function writing to DynamoDB', 'cross-account application calling SQS', 'on-prem app needing temporary AWS credentials', 'CI/CD pipeline deploying CloudFormation stacks'],
    },
    stem: 'Best identity primitive for: {{need}}.',
    options: [
      { text: 'IAM Roles assumed by the workload (instance profile, Lambda execution role, cross-account trust, IAM Roles Anywhere, OIDC for CI/CD) — temporary credentials, no static keys.', correct: true },
      { text: 'A long-lived IAM user with access keys baked into the application code.', correct: false, distractor: { type: 'iam-user-when-role-needed', explanation: 'Static keys leak; roles give rotated, scoped credentials.' } },
      { text: 'The root account credentials shared via secret manager.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Root must never be used for workloads.' } },
      { text: 'Disable IAM and rely on resource policies alone for everything.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'IAM is the identity layer; not optional.' } },
    ],
    explanation: 'IAM Roles + STS deliver short-lived credentials per workload: instance profile (EC2), execution role (Lambda), trust policy (cross-account), Roles Anywhere (on-prem with X.509), OIDC federation (GitHub Actions/CI). Static IAM-user keys are a last resort and should not be embedded in code.',
    maxVariants: 5,
  },

  {
    id: 'tpl-118',
    conceptSlug: 'scp-organizations',
    blueprintTaskId: '1.1',
    patternTag: 'most-secure',
    difficulty: 0.6,
    slots: {
      goal: ['prevent any account from disabling CloudTrail', 'block unapproved Regions for all accounts in an OU', 'forbid root user actions across the organization', 'cap the services every dev sandbox can use', 'enforce that S3 buckets cannot be made public'],
    },
    stem: 'Best Organizations control to {{goal}}.',
    options: [
      { text: 'Service Control Policies (SCPs) attached at the OU/account level — guardrails that no IAM identity (including root) can override.', correct: true },
      { text: 'IAM permission policies attached to every user manually.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'IAM cannot stop root; SCPs can.' } },
      { text: 'Trusted Advisor checks alone with email reminders.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'TA reports; does not enforce.' } },
      { text: 'A bucket policy template applied to each account on creation.', correct: false, distractor: { type: 'wrong-region-scope', explanation: 'Bucket policy is per-bucket; SCP is org-wide guardrail.' } },
    ],
    explanation: 'SCPs are the AWS Organizations guardrail mechanism — they limit the maximum permissions accessible in target accounts (deny-list or allow-list style) and apply even to root. They do not grant permissions; they cap them. The standard tool for org-wide compliance enforcement.',
    maxVariants: 5,
  },

  {
    id: 'tpl-119',
    conceptSlug: 'cognito',
    blueprintTaskId: '1.1',
    patternTag: 'identity-federation',
    difficulty: 0.55,
    slots: {
      need: ['mobile app sign-in with social/OIDC providers', 'public web app needing temporary AWS credentials for S3', 'enterprise SSO via SAML for an AWS-hosted webapp', 'guest access to a small subset of AWS resources', 'MFA-enforced sign-in with managed user directory'],
    },
    stem: 'Cognito feature for: {{need}}.',
    options: [
      { text: 'User Pools for sign-up/sign-in (with social/SAML/OIDC + MFA), Identity Pools for temporary AWS credentials (authenticated and guest).', correct: true },
      { text: 'IAM users created per end-customer of the application.', correct: false, distractor: { type: 'iam-user-when-role-needed', explanation: 'IAM is for AWS humans/workloads; not end-user auth.' } },
      { text: 'A custom OAuth server on EC2 with hand-rolled token issuance.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Cognito is the managed identity service.' } },
      { text: 'A long-lived API key shared by every mobile client.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Static shared key violates basic credential hygiene.' } },
    ],
    explanation: 'Cognito has two halves: User Pools (managed user directory, OAuth/OIDC/SAML providers, MFA, hosted UI) and Identity Pools (federated identities exchanged for temporary AWS credentials via IAM roles, supports authenticated + unauthenticated/guest).',
    maxVariants: 5,
  },

  // D1.2 — secure workloads
  {
    id: 'tpl-120',
    conceptSlug: 'inspector',
    blueprintTaskId: '1.2',
    patternTag: 'monitoring-observability',
    difficulty: 0.5,
    slots: {
      target: ['EC2 instances for OS CVEs', 'container images in ECR for vulnerabilities', 'Lambda functions for vulnerable dependencies', 'continuous scanning across an entire Organization'],
    },
    stem: 'Vulnerability scanning of {{target}} — best AWS service?',
    options: [
      { text: 'Amazon Inspector — agentless EC2/ECR/Lambda CVE scanning with automated continuous re-evaluation and Security Hub integration.', correct: true },
      { text: 'GuardDuty findings filtered by severity.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'GuardDuty is threat detection on logs, not CVE scanning.' } },
      { text: 'Manual nessus scans run quarterly by ops.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Inspector is continuous and managed.' } },
      { text: 'WAF managed rules looking for vulnerable user-agent strings.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'WAF inspects HTTP traffic, not host vulnerabilities.' } },
    ],
    explanation: 'Inspector is the AWS-managed CVE scanner: agentless EC2 (via SSM), ECR image scan on push and continuously, Lambda function scanning for vulnerable dependencies. Findings flow to Security Hub. Replaces self-managed Nessus/Qualys for AWS resources.',
    maxVariants: 4,
  },

  {
    id: 'tpl-121',
    conceptSlug: 'security-groups-vs-nacls',
    blueprintTaskId: '1.2',
    patternTag: 'network-segmentation',
    difficulty: 0.5,
    slots: {
      need: ['allow only port 443 to a web server from anywhere', 'block a specific malicious IP range at the subnet edge', 'restrict EC2-to-RDS traffic to specific security groups', 'audit subnet-level connection state'],
    },
    stem: 'Best primitive for: {{need}}.',
    options: [
      { text: 'Security Groups (stateful, instance-level, allow-only) for app-to-app rules; NACLs (stateless, subnet-level, allow + deny) for IP-range blocks.', correct: true },
      { text: 'Always NACLs for everything because they support deny rules.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'Stateless rules require explicit return-traffic rules — error-prone for app-level control.' } },
      { text: 'Always Security Groups because they are simpler.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'SGs cannot deny; cannot block specific IPs.' } },
      { text: 'A single firewall EC2 instance routing all traffic.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'AWS Network Firewall or SG/NACL replace this.' } },
    ],
    explanation: 'Security Groups are stateful, instance-attached, allow-only — the right tool for application-tier rules ("web SG can talk to DB SG"). NACLs are stateless, subnet-attached, support deny — the tool for IP-range blocks at the subnet edge. They complement each other.',
    maxVariants: 4,
  },

  // D1.3 — data security
  {
    id: 'tpl-122',
    conceptSlug: 's3-access-points',
    blueprintTaskId: '1.3',
    patternTag: 'most-secure',
    difficulty: 0.55,
    slots: {
      need: ['per-application access policies on a shared bucket', 'restrict access points to a specific VPC', 'multi-Region active-active S3 access via a single endpoint', 'cross-account analyst access scoped to a prefix'],
    },
    stem: 'S3 feature for: {{need}}.',
    options: [
      { text: 'S3 Access Points (per-app named endpoints with their own policies and VPC-only flag); Multi-Region Access Points for routing across replicated buckets.', correct: true },
      { text: 'A single bucket policy that hand-rolls every application path with one giant document.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Bucket policies hit size limits and are hard to govern at scale.' } },
      { text: 'A new S3 bucket per application with manual replication scripts.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Access Points solve this without bucket sprawl.' } },
      { text: 'IAM users created per application accessing the bucket directly.', correct: false, distractor: { type: 'iam-user-when-role-needed', explanation: 'Roles + Access Points are the right pattern.' } },
    ],
    explanation: 'S3 Access Points create named per-application endpoints into a single bucket, each with its own access-point policy (and optional VPC-only restriction). Multi-Region Access Points route requests across replicated buckets in multiple Regions via a single global hostname.',
    maxVariants: 4,
  },

  {
    id: 'tpl-123',
    conceptSlug: 's3-replication',
    blueprintTaskId: '1.3',
    patternTag: 'compliance-immutable',
    difficulty: 0.55,
    slots: {
      goal: ['cross-Region disaster recovery with KMS re-encryption', 'cross-account replication for ransomware isolation', 'replicate only objects matching a tag prefix', 'replicate within the same Region across accounts'],
    },
    stem: 'S3 replication setup for: {{goal}}.',
    options: [
      { text: 'S3 CRR/SRR with replica KMS key, destination-owner override, replication rules with prefix/tag filters, and replication time control (RTC) for SLA.', correct: true },
      { text: 'Manual nightly aws s3 sync from a cron on EC2.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Native replication is event-driven and SLA-backed.' } },
      { text: 'Versioning alone with no replication configured.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Versioning is intra-bucket; not DR.' } },
      { text: 'S3 Transfer Acceleration as the replication mechanism.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Transfer Acceleration is for upload speed, not replication.' } },
    ],
    explanation: 'S3 Replication (CRR cross-Region, SRR same-Region) is event-driven: requires Versioning, supports filter rules (prefix/tag), replica KMS keys, destination-owner override (cross-account), and Replication Time Control (15-minute SLA with metrics).',
    maxVariants: 4,
  },

  // D2.1 — scalable & loosely coupled
  {
    id: 'tpl-222',
    conceptSlug: 'sqs-vs-sns-vs-eventbridge',
    blueprintTaskId: '2.1',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.55,
    slots: {
      use: ['decouple producer and slow consumer with retry and DLQ', 'fan-out one event to 10 different services', 'route events from many SaaS sources with content-based filtering', 'guaranteed FIFO ordering by customer ID'],
    },
    stem: 'Best messaging primitive for: {{use}}.',
    options: [
      { text: 'SQS (Standard or FIFO) for queue/DLQ; SNS for fan-out pub-sub; EventBridge for SaaS sources, schemas, and content-based routing.', correct: true },
      { text: 'EventBridge for every messaging need including FIFO ordered queueing.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'EventBridge has no FIFO ordering or DLQ replay semantics.' } },
      { text: 'A single SNS topic chaining straight into another SNS topic for queueing.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'SNS has no buffering; SQS does.' } },
      { text: 'Kinesis Data Streams for everything since it is the most scalable.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Streams is not a queue; consumers must be built for stream semantics.' } },
    ],
    explanation: 'SQS = decoupling queue (Standard at-least-once or FIFO exactly-once with ordering by group). SNS = pub-sub fan-out to multiple subscribers. EventBridge = event bus with SaaS partner sources, schemas, and content-based filtering. Pick by semantics, not by trend.',
    maxVariants: 4,
  },

  {
    id: 'tpl-223',
    conceptSlug: 'ec2-auto-scaling',
    blueprintTaskId: '2.1',
    patternTag: 'scalable-elastic',
    difficulty: 0.55,
    slots: {
      profile: ['traffic spike during predictable business hours', 'unpredictable bursts requiring fast response', 'queue depth-driven scale-out', 'fleet of mixed Spot+On-Demand for cost'],
    },
    stem: 'Auto Scaling configuration for: {{profile}}.',
    options: [
      { text: 'Mix of Scheduled actions (predictable), Target Tracking on CPU/ALB request count (steady), Step scaling on SQS depth (queue), and Mixed Instances Policy with Spot for cost.', correct: true },
      { text: 'A single static instance count and scale manually when paged.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Defeats the purpose of ASG.' } },
      { text: 'Predictive Scaling alone replacing all other policies forever.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Predictive is an addition, not a single replacement.' } },
      { text: 'Trigger scale-out on a 5-minute average — even for sudden bursts.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Slow reaction; bursts need step or target tracking with shorter eval.' } },
    ],
    explanation: 'EC2 Auto Scaling supports multiple policy types simultaneously: Scheduled (predictable), Target Tracking (steady on a metric), Step scaling (custom CloudWatch metrics like SQS depth), and Predictive (ML forecast). Mixed Instances Policies blend Spot/On-Demand/RIs for cost.',
    maxVariants: 4,
  },

  // D2.2 — HA / fault-tolerant
  {
    id: 'tpl-224',
    conceptSlug: 'elb-types',
    blueprintTaskId: '2.2',
    patternTag: 'highest-availability',
    difficulty: 0.55,
    slots: {
      workload: ['HTTP/HTTPS microservices with path-based routing', 'TCP/UDP gaming server with millions of connections', 'transparent inline firewall appliance fleet', 'static IPs required by clients with corporate firewalls'],
    },
    stem: 'Best load balancer for: {{workload}}.',
    options: [
      { text: 'ALB for HTTP/path-based; NLB for TCP/UDP at extreme scale and static IPs; GWLB for inline firewall/IDS appliances; Global Accelerator for anycast IPs.', correct: true },
      { text: 'Always Classic Load Balancer because it is the simplest option.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'CLB is legacy; lacks features and cost-efficiency of ALB/NLB.' } },
      { text: 'API Gateway in front of the workload for every load-balancing scenario.', correct: false, distractor: { type: 'wrong-load-balancer-type', explanation: 'API Gateway is API management, not transport-layer LB.' } },
      { text: 'Pure DNS round-robin for any large workload.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'No health checks, no session affinity.' } },
    ],
    explanation: 'ALB is L7 with path/host routing, gRPC, WebSockets. NLB is L4 with millions of conns, static IPs, source-IP preservation. GWLB chains traffic through inline appliances (firewalls/IDS) using GENEVE. Pick by protocol layer and feature need.',
    maxVariants: 4,
  },

  {
    id: 'tpl-225',
    conceptSlug: 'datasync',
    blueprintTaskId: '2.2',
    patternTag: 'migrate-minimal-disruption',
    difficulty: 0.5,
    slots: {
      transfer: ['100 TB from on-prem NFS to S3 over Direct Connect', 'EFS-to-EFS cross-Region copy', 'on-prem SMB to FSx for Windows scheduled nightly', 'cross-account S3 migration with verification'],
    },
    stem: 'Best service for: {{transfer}}.',
    options: [
      { text: 'AWS DataSync — managed online data transfer agent with parallel multi-threaded copy, integrity verification, and scheduling.', correct: true },
      { text: 'Snowball Edge for any online data transfer.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Snow is offline; appropriate only above ~10 TB AND limited bandwidth.' } },
      { text: 'rsync over SSH on a single EC2 instance.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Single-threaded; no validation; not the AWS-native answer.' } },
      { text: 'Storage Gateway as a one-time copy mechanism.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Gateway is steady-state hybrid, not one-shot transfer.' } },
    ],
    explanation: 'DataSync is the AWS-native online migration tool: agent on-prem (or in-VPC for cloud-cloud), parallel transfer, automatic retry, MD5 verification, scheduling and bandwidth throttling. Targets S3, EFS, FSx (Windows/Lustre/ONTAP). Use Snow only when bandwidth is insufficient.',
    maxVariants: 4,
  },

  {
    id: 'tpl-226',
    conceptSlug: 'snow-family',
    blueprintTaskId: '2.2',
    patternTag: 'migrate-minimal-disruption',
    difficulty: 0.5,
    slots: {
      situation: ['80 TB to migrate with no Direct Connect and slow internet', 'edge processing in a disconnected ship for 3 months', 'multi-PB data lake migration in one shipment', 'compute + storage in a remote site with intermittent connectivity'],
    },
    stem: 'Best Snow Family device for: {{situation}}.',
    options: [
      { text: 'Snowcone for small edge, Snowball Edge for medium edge + 80 TB transfer, Snowmobile for petabyte-scale shipments — pick by capacity and need for compute.', correct: true },
      { text: 'DataSync for any multi-TB transfer regardless of bandwidth available.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'When bandwidth is the bottleneck Snow wins.' } },
      { text: 'A hard drive shipped via FedEx in normal mail.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'No encryption guarantee, no chain-of-custody.' } },
      { text: 'Direct Connect 100 Gbps for any one-time large transfer.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'DX is for steady-state; provisioning lead time defeats one-time use.' } },
    ],
    explanation: 'Snow Family bridges compute+storage to disconnected/edge. Snowcone (tiny edge, 8/14 TB), Snowball Edge (compute-intensive or storage-optimized, ~50–80 TB), Snowmobile (100 PB shipping container). Encrypted in-transit, chain-of-custody, and tamper-evident.',
    maxVariants: 4,
  },

  {
    id: 'tpl-227',
    conceptSlug: 'ec2-placement-groups',
    blueprintTaskId: '2.2',
    patternTag: 'highest-availability',
    difficulty: 0.6,
    slots: {
      need: ['HPC workload requiring 100 Gbps low-latency between nodes', 'critical app needing fault tolerance across separate hardware in one AZ', 'large rack-aware Hadoop cluster spanning multiple racks'],
    },
    stem: 'Best EC2 placement group for: {{need}}.',
    options: [
      { text: 'Cluster (low-latency, single-AZ) for HPC; Spread (separate hardware, max 7/AZ) for HA-critical small workloads; Partition (rack-aware) for large distributed data systems.', correct: true },
      { text: 'No placement group ever — defaults are always correct.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Default placement does not optimize for HPC or rack-fault tolerance.' } },
      { text: 'Cluster placement across multiple AZs for both HPC and HA.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'Cluster is single-AZ by definition.' } },
      { text: 'Spread placement of 100 instances per AZ for an HPC job.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'Spread caps at 7/AZ; not HPC-grade latency.' } },
    ],
    explanation: 'Three placement strategies: Cluster (same rack, lowest latency, single AZ — HPC). Spread (each instance on distinct hardware, max 7/AZ — small critical workloads). Partition (rack-isolated groups, used by Hadoop/Cassandra for rack awareness).',
    maxVariants: 3,
  },

  // D3.3 — high-performance database
  {
    id: 'tpl-326',
    conceptSlug: 'elasticache',
    blueprintTaskId: '3.3',
    patternTag: 'caching-strategy',
    difficulty: 0.55,
    slots: {
      pattern: ['DynamoDB read-heavy with sub-ms latency target', 'RDS read offload during peak', 'session store for stateless web fleet', 'leaderboard with sorted-set semantics'],
    },
    stem: 'Caching strategy for: {{pattern}}.',
    options: [
      { text: 'DAX for DynamoDB, ElastiCache for Redis (lazy-loading or write-through) in front of RDS, Redis for sessions and sorted-set leaderboards.', correct: true },
      { text: 'Self-managed Redis on EC2 with manual failover for every workload.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'ElastiCache is managed; DAX is DynamoDB-specific.' } },
      { text: 'Add CloudFront in front of the database for read caching.', correct: false, distractor: { type: 'misuses-caching', explanation: 'CloudFront is a CDN for HTTP, not DB result cache.' } },
      { text: 'Increase RDS instance size repeatedly to absorb read load.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Caching is the right answer; vertical scaling is expensive.' } },
    ],
    explanation: 'DAX is the DynamoDB-only in-memory accelerator (microseconds). ElastiCache Redis is the general-purpose cache (lazy-loading, write-through, TTL). Sessions and leaderboards rely on Redis-specific data structures. Always cache only what reads more than writes.',
    maxVariants: 4,
  },

  {
    id: 'tpl-327',
    conceptSlug: 'rds-read-replicas',
    blueprintTaskId: '3.3',
    patternTag: 'highest-throughput',
    difficulty: 0.5,
    slots: {
      pattern: ['offload reporting queries from primary', 'serve global low-latency reads from 5 Regions', 'promote a replica during planned maintenance', 'cross-engine reads (MySQL primary, MySQL replica)'],
    },
    stem: 'RDS read-replica plan for: {{pattern}}.',
    options: [
      { text: 'Up to 15 read replicas (in-Region or cross-Region), promote during maintenance, route read traffic via app or RDS Proxy.', correct: true },
      { text: 'Multi-AZ standby used as a read replica (it is not).', correct: false, distractor: { type: 'underestimates-availability', explanation: 'RDS Multi-AZ standby is not readable.' } },
      { text: 'Manual nightly backup + restore as the read scale-out plan.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Replicas stream changes continuously; backups do not.' } },
      { text: 'A second separate RDS instance with hand-rolled scripts to copy rows.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Read replicas are the managed answer.' } },
    ],
    explanation: 'RDS read replicas (up to 15) replicate asynchronously and can be in-Region or cross-Region; they are independently promotable for DR or planned maintenance. Multi-AZ standby is for HA, NOT readable. Aurora cluster has its own reader endpoint with up to 15 readers.',
    maxVariants: 4,
  },

  {
    id: 'tpl-328',
    conceptSlug: 'aurora-performance',
    blueprintTaskId: '3.3',
    patternTag: 'highest-throughput',
    difficulty: 0.55,
    slots: {
      need: ['scale to 128 vCPUs during business hours, idle off-hours', 'serverless tier that responds to sudden bursts', 'parallel query for analytical workloads on Aurora', 'low-latency reads from up to 15 readers'],
    },
    stem: 'Aurora feature for: {{need}}.',
    options: [
      { text: 'Aurora Provisioned with Auto Scaling readers, Aurora Serverless v2 for bursty, Parallel Query for analytics, and reader endpoint with up to 15 readers.', correct: true },
      { text: 'A single huge db.r6g.16xlarge running 24/7 forever.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'No elasticity; expensive.' } },
      { text: 'Switch to RDS PostgreSQL Single-AZ for performance gains.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Aurora outperforms vanilla RDS at scale.' } },
      { text: 'Use DynamoDB Streams as the analytics layer.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'NoSQL streams are not a parallel-query analytics engine.' } },
    ],
    explanation: 'Aurora separates compute from storage and supports Auto Scaling readers, Serverless v2 (0.5 ACU steps), Parallel Query (push down to storage layer), and a reader endpoint that load-balances across up to 15 read replicas in the same cluster.',
    maxVariants: 4,
  },

  // D3.4 — high-performance networking
  {
    id: 'tpl-329',
    conceptSlug: 'vpc-endpoints',
    blueprintTaskId: '3.4',
    patternTag: 'lowest-latency',
    difficulty: 0.55,
    slots: {
      need: ['private S3 access from VPC without internet', 'private API call to DynamoDB from a private subnet', 'private connectivity to KMS or Secrets Manager', 'private third-party SaaS via PrivateLink'],
    },
    stem: 'VPC endpoint type for: {{need}}.',
    options: [
      { text: 'Gateway Endpoints for S3 and DynamoDB (free, route-table based); Interface Endpoints (PrivateLink, ENI-based) for AWS services and third-party SaaS.', correct: true },
      { text: 'NAT Gateway as the privacy primitive for AWS service access.', correct: false, distractor: { type: 'public-when-private-needed', explanation: 'NAT still hits public AWS endpoints.' } },
      { text: 'A Customer Gateway with site-to-site VPN to AWS services.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'CGW is for on-prem, not in-VPC service access.' } },
      { text: 'VPC Peering between every VPC and AWS service VPCs.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'AWS services are not exposed via peering.' } },
    ],
    explanation: 'Gateway Endpoints (S3, DynamoDB) route via route table, no ENI, free. Interface Endpoints (PrivateLink) attach an ENI per AZ, cost hourly + per-GB, and cover most AWS services and third-party SaaS published as PrivateLink services.',
    maxVariants: 4,
  },

  {
    id: 'tpl-330',
    conceptSlug: 'cloudfront-caching',
    blueprintTaskId: '3.4',
    patternTag: 'lowest-latency',
    difficulty: 0.5,
    slots: {
      content: ['static assets with month-long TTL', 'dynamic API responses cacheable for 5 seconds', 'mixed origins with different cache requirements', 'live video streaming to global audience'],
    },
    stem: 'CloudFront caching strategy for: {{content}}.',
    options: [
      { text: 'Cache policies per behavior with appropriate TTLs, Origin Request Policy for forwarded headers, Origin Shield for cache hit ratio, and CMAF for live video.', correct: true },
      { text: 'A single global TTL of 0 to always go to origin.', correct: false, distractor: { type: 'misuses-caching', explanation: 'Defeats the CDN purpose.' } },
      { text: 'Pure static caching with no dynamic content support.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'CloudFront supports dynamic content with TTL=0 or short TTL.' } },
      { text: 'A Lambda invoked on every request as the cache layer.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'CloudFront is the cache; Lambda@Edge augments behavior, not replaces.' } },
    ],
    explanation: 'CloudFront cache behaviors define TTL per path. Cache Policy (TTL + key) and Origin Request Policy (forwarded headers/cookies) decouple cache key from origin. Origin Shield reduces origin load. CMAF + LL-HLS supports low-latency live streaming.',
    maxVariants: 4,
  },

  // D4.1 — cost-optimized storage
  {
    id: 'tpl-421',
    conceptSlug: 'datasync',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      transfer: ['frequent on-prem-to-S3 sync of changed files', 'one-time 50 TB migration over 1 Gbps link', 'cloud-to-cloud cross-Region copy of EFS', 'on-prem backup to S3 Glacier for archive'],
    },
    stem: 'Cheapest correct transfer mechanism for: {{transfer}}.',
    options: [
      { text: 'DataSync for online (cents per GB, parallel transfer, validation), Snowball when bandwidth is the bottleneck, S3 Replication for cloud-cloud bucket copies.', correct: true },
      { text: 'A custom rsync script on a Lambda function looping in 15-minute increments.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Lambda timeouts; no incremental tracking.' } },
      { text: 'Storage Gateway on a permanent EC2 instance for one-time transfers.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Gateway is steady-state, not migration.' } },
      { text: 'Direct Connect 10 Gbps provisioned for 60 days for a one-time copy.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'DX is steady-state; provisioning lead time and cost wrong fit.' } },
    ],
    explanation: 'For cost-effective transfer: DataSync (online, parallel, ~$0.0125/GB), Snowball Edge (offline, when bandwidth costs exceed device fee — typically >10 TB on slow links), S3 Replication (cloud-to-cloud), Storage Gateway (steady-state hybrid).',
    maxVariants: 4,
  },

  {
    id: 'tpl-422',
    conceptSlug: 'ebs-cost-optimization',
    blueprintTaskId: '4.1',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      issue: ['gp2 volumes that could be downsized to gp3', 'unused volumes from terminated instances', 'snapshots accumulating without lifecycle', 'over-provisioned IOPS on io1'],
    },
    stem: 'Cost optimization action for: {{issue}}.',
    options: [
      { text: 'Migrate gp2 → gp3 (cheaper at same IOPS), delete orphaned volumes via Compute Optimizer, automate snapshot lifecycle with Data Lifecycle Manager, right-size io1 IOPS.', correct: true },
      { text: 'Keep all unused volumes for 1 year just in case.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Idle EBS still bills at full rate.' } },
      { text: 'Manually take screenshots of volume metrics monthly.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Compute Optimizer + DLM automate this.' } },
      { text: 'Disable EBS snapshots entirely to save money.', correct: false, distractor: { type: 'wrong-rpo-rto-match', explanation: 'No backup means catastrophic data loss risk.' } },
    ],
    explanation: 'EBS cost wins: gp3 (decoupled IOPS/throughput, ~20% cheaper than gp2), AWS Backup or Data Lifecycle Manager for snapshot rotation, Compute Optimizer to spot orphaned and over-provisioned volumes, right-size io1/io2 IOPS to actual workload.',
    maxVariants: 4,
  },

  // D4.3 — cost-optimized database
  {
    id: 'tpl-423',
    conceptSlug: 'dynamodb-performance',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      pattern: ['unpredictable workload with idle periods', 'predictable steady traffic at 5k RPS', 'spiky workload with predictable peaks twice a day', 'global table with very low traffic in some Regions'],
    },
    stem: 'DynamoDB capacity mode for: {{pattern}}.',
    options: [
      { text: 'On-Demand for unpredictable/idle, Provisioned + Auto Scaling for predictable steady, Provisioned with Reserved Capacity for the deepest discount on stable workloads.', correct: true },
      { text: 'Provisioned with very high static RCU/WCU regardless of actual traffic.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Wastes money on idle capacity.' } },
      { text: 'Always On-Demand because it has no provisioning hassle.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'On-Demand costs ~6× more per request than Provisioned at scale.' } },
      { text: 'Switch to Aurora because DynamoDB cost is unpredictable.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Aurora is relational; doesn\'t solve key-value workload economics.' } },
    ],
    explanation: 'On-Demand is great for idle/unpredictable but costly per request. Provisioned + Auto Scaling tracks steady patterns. Reserved Capacity (1y or 3y) gives ~50–70% discount on Provisioned RCU/WCU baseline. Match capacity mode to traffic shape.',
    maxVariants: 4,
  },

  {
    id: 'tpl-424',
    conceptSlug: 'elasticache-redis-vs-memcached',
    blueprintTaskId: '4.3',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      need: ['offload 80% of read traffic from RDS', 'reduce DynamoDB RCU consumption with caching', 'cache popular product detail pages globally'],
    },
    stem: 'Cheapest correct caching for: {{need}}.',
    options: [
      { text: 'ElastiCache (Redis) in front of RDS, DAX in front of DynamoDB, CloudFront for HTTP-cacheable pages — caching cuts DB billable units dramatically.', correct: true },
      { text: 'Add more RDS read replicas indefinitely until reads keep up.', correct: false, distractor: { type: 'misuses-caching', explanation: 'Replicas help but cache cents-per-hit beats per-replica cost.' } },
      { text: 'Increase DynamoDB provisioned WCU thinking it scales reads.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'WCU is writes; reads are RCU.' } },
      { text: 'Disable caching to save the cache cluster bill.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Cache miss cost on origin is much higher than cluster fee.' } },
    ],
    explanation: 'Caching wins on cost when read >> write. ElastiCache offloads RDS reads at sub-ms latency for cents/hour. DAX cuts DynamoDB RCU consumption (microsecond reads). CloudFront caches HTTP at the edge, eliminating origin reads entirely for cacheable content.',
    maxVariants: 3,
  },

  // D4.4 — cost-optimized networking
  {
    id: 'tpl-425',
    conceptSlug: 'cloudfront-caching',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      goal: ['cut S3 egress cost on a high-traffic public site', 'reduce ALB request cost on a CDN-cacheable workload', 'minimize cross-Region data transfer for read-mostly content'],
    },
    stem: 'Cheapest network architecture for: {{goal}}.',
    options: [
      { text: 'CloudFront in front of origin (S3/ALB) — egress to internet is cheaper than direct S3, requests are absorbed at the edge, and cross-Region reads can be served from edge cache.', correct: true },
      { text: 'Direct origin access from clients with no CDN.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'S3/ALB egress + per-request cost is much higher than CloudFront-served.' } },
      { text: 'A NAT Gateway in each AZ accelerating egress.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'NAT GW is for VPC egress, not user-facing CDN.' } },
      { text: 'Pure Route 53 caching the response in DNS.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'Route 53 caches DNS records, not HTTP bodies.' } },
    ],
    explanation: 'CloudFront acts as both performance accelerator and cost reducer: egress from CloudFront is cheaper than direct S3/ALB, edge cache absorbs requests (cutting per-request cost), and cross-Region reads served from a nearby edge avoid expensive cross-Region transfer fees.',
    maxVariants: 3,
  },

  // Wave 6 — close the gap to 500
  {
    id: 'tpl-124',
    conceptSlug: 'iam-identity-center-sso',
    blueprintTaskId: '1.1',
    patternTag: 'identity-federation',
    difficulty: 0.55,
    slots: {
      need: ['SSO across 50 AWS accounts with corporate Active Directory', 'centralized permission sets for engineering vs finance', 'short-lived AWS credentials for the CLI', 'attribute-based access using AD group membership', 'one-time setup with periodic auditing of access'],
    },
    stem: 'Best identity solution for: {{need}}.',
    options: [
      { text: 'AWS IAM Identity Center (formerly AWS SSO) with permission sets, AD/Azure AD/Okta as IdP, AWS access portal for CLI credentials, and ABAC via session tags.', correct: true },
      { text: 'Per-account IAM users provisioned manually for every engineer.', correct: false, distractor: { type: 'iam-user-when-role-needed', explanation: 'Does not scale; no SSO; static credentials.' } },
      { text: 'A single shared IAM user with the access keys rotated monthly.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Shared identity violates auditability.' } },
      { text: 'Cognito User Pools as the workforce SSO solution.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'Cognito is for end-customers; Identity Center is for workforce.' } },
    ],
    explanation: 'IAM Identity Center is the AWS workforce SSO. Federate to AD/Azure AD/Okta, define permission sets, assign users/groups to accounts, and consume from the access portal (web + CLI). ABAC works via session tags propagated from the IdP.',
    maxVariants: 5,
  },

  {
    id: 'tpl-125',
    conceptSlug: 'shield-waf',
    blueprintTaskId: '1.2',
    patternTag: 'most-secure',
    difficulty: 0.55,
    slots: {
      threat: ['SYN-flood DDoS on a public CloudFront distribution', 'OWASP top-10 attacks on a public ALB', 'rate-limit abuse from a small set of IPs', 'application-layer DDoS with cost-protection guarantees', 'bot scraping product pages aggressively'],
    },
    stem: 'Defense against: {{threat}}.',
    options: [
      { text: 'AWS Shield Advanced (DDoS, cost-protection refunds), AWS WAF (managed rule groups for OWASP, rate-based rules), and AWS WAF Bot Control.', correct: true },
      { text: 'Security Groups configured to block specific countries.', correct: false, distractor: { type: 'wrong-network-topology', explanation: 'SGs are not Layer 7 and have no geo or attack-pattern matching.' } },
      { text: 'Shield Standard alone for application-layer protection.', correct: false, distractor: { type: 'underestimates-availability', explanation: 'Shield Standard is L3/L4 only; needs WAF for L7.' } },
      { text: 'A single NACL with deny rules added by a Lambda after attacks.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Reactive; managed rule groups are continuous.' } },
    ],
    explanation: 'Shield Standard (free, L3/L4) is auto-applied. Shield Advanced adds L7 protection, 24/7 DRT support, and cost-protection refunds during attacks. AWS WAF provides L7 rules: managed groups for OWASP/IP-reputation, rate-based rules, and Bot Control for bot management.',
    maxVariants: 5,
  },

  {
    id: 'tpl-126',
    conceptSlug: 's3-security',
    blueprintTaskId: '1.3',
    patternTag: 'most-secure',
    difficulty: 0.5,
    slots: {
      need: ['enforce TLS-only access to all objects', 'block public access at the account level', 'encrypt all objects with SSE-KMS by default', 'audit every object-level API call', 'verify object integrity end-to-end'],
    },
    stem: 'Best S3 security control for: {{need}}.',
    options: [
      { text: 'Account-level Block Public Access, default bucket SSE-KMS encryption, bucket policy aws:SecureTransport=true, S3 server access logs + CloudTrail data events, S3 Object Lambda or checksums for integrity.', correct: true },
      { text: 'Rely on individual user discretion for bucket-level encryption.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'No defaults means inconsistent posture.' } },
      { text: 'A single IAM policy at the org root with broad s3:* permissions.', correct: false, distractor: { type: 'over-permissive-iam', explanation: 'Wildcard policies break least privilege.' } },
      { text: 'Disable CloudTrail for S3 to save on log storage.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Audit logging is non-negotiable for compliance.' } },
    ],
    explanation: 'S3 security is a layered set: Account-level Block Public Access (overrides bucket settings), default bucket encryption (SSE-KMS or SSE-S3), TLS-only via bucket policy aws:SecureTransport, CloudTrail data events for object-level audit, and SHA-256 checksums for end-to-end integrity.',
    maxVariants: 5,
  },

  // Wave 7 — D3 expansion to close the final gap
  {
    id: 'tpl-331',
    conceptSlug: 'ec2-instance-types',
    blueprintTaskId: '3.2',
    patternTag: 'highest-throughput',
    difficulty: 0.5,
    slots: {
      workload: ['memory-bound in-memory database', 'CPU-bound encoding pipeline', 'GPU-accelerated ML inference', 'storage-IO-intensive analytics', 'network-intensive HPC node'],
    },
    stem: 'Pick the EC2 family for: {{workload}}.',
    options: [
      { text: 'R/X (memory), C (compute), G/P/Inf/Trn (GPU/ML), I/D (storage IO), Hpc (HPC) — match family to dominant resource.', correct: true },
      { text: 'Always M-family because it is general-purpose.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'M is balanced; loses to specialized families on bottleneck workloads.' } },
      { text: 'T3 burstable for every production workload.', correct: false, distractor: { type: 'wrong-storage-tier', explanation: 'Burstable is for idle/spiky; not steady production.' } },
      { text: 'A single largest instance regardless of workload type.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'Wastes capacity outside the dominant resource.' } },
    ],
    explanation: 'EC2 families specialize: M (general), C (compute-optimized), R/X (memory-optimized), G/P/Inf/Trn (accelerators for ML/graphics), I/D (storage-IO), Hpc (HPC interconnect). Pick the family that matches the bottleneck resource of the workload.',
    maxVariants: 5,
  },

  {
    id: 'tpl-332',
    conceptSlug: 'ecs-vs-eks-vs-fargate',
    blueprintTaskId: '3.2',
    patternTag: 'serverless-vs-container',
    difficulty: 0.55,
    slots: {
      need: ['simple container workload with minimal Kubernetes complexity', 'existing Kubernetes investment with portable tooling', 'serverless containers without node management', 'long-running stateful services with EBS volumes', 'spot-friendly batch workers'],
    },
    stem: 'Best container service for: {{need}}.',
    options: [
      { text: 'ECS for simple AWS-native, EKS when Kubernetes is the standard, Fargate as the serverless launch type, EBS-backed tasks via ECS, Spot via capacity providers.', correct: true },
      { text: 'Self-managed Kubernetes on EC2 with no managed control plane.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'EKS is the managed option.' } },
      { text: 'Lambda functions replacing every container workload regardless of duration.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: '15-minute Lambda limit; not for long-running services.' } },
      { text: 'Beanstalk environments for every container scenario.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Beanstalk is platform-as-a-service, less flexible than ECS/EKS.' } },
    ],
    explanation: 'ECS = AWS-native simpler orchestration. EKS = managed Kubernetes (use when k8s ecosystem matters). Fargate = serverless launch type (no node mgmt) usable by both ECS and EKS. EBS-backed ECS tasks for stateful. Capacity providers blend EC2/Fargate/Spot.',
    maxVariants: 5,
  },

  {
    id: 'tpl-333',
    conceptSlug: 'fargate-vs-lambda',
    blueprintTaskId: '3.2',
    patternTag: 'serverless-vs-container',
    difficulty: 0.55,
    slots: {
      workload: ['HTTP API with sub-100ms cold-start tolerance', 'long-running batch job over 15 minutes', 'WebSocket service holding 10k connections', 'cron-triggered transient task', 'GPU workload for ML inference'],
    },
    stem: 'Best serverless compute for: {{workload}}.',
    options: [
      { text: 'Lambda for short event-driven functions; Fargate for long-running, persistent connections, GPU, or workloads needing custom container runtime.', correct: true },
      { text: 'EC2 for any container workload regardless of management overhead.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Fargate removes node management.' } },
      { text: 'Lambda for everything including 1-hour batch jobs.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'Lambda hard limit 15 minutes.' } },
      { text: 'Step Functions as the runtime for both Lambda and Fargate scenarios.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Step Functions orchestrates; does not run containers.' } },
    ],
    explanation: 'Lambda: event-driven, ≤15 min, ≤10 GB memory, cold starts mitigated by Provisioned Concurrency. Fargate: long-running, container-native, persistent connections, custom runtimes, supports GPU on certain instance types. Pick by duration and runtime needs.',
    maxVariants: 5,
  },

  {
    id: 'tpl-334',
    conceptSlug: 'lambda-patterns',
    blueprintTaskId: '3.2',
    patternTag: 'event-driven-decoupling',
    difficulty: 0.5,
    slots: {
      trigger: ['S3 ObjectCreated for image processing', 'API Gateway HTTP request with auth', 'DynamoDB Stream for change-data-capture', 'SQS queue with retry and DLQ', 'EventBridge schedule for cron jobs'],
    },
    stem: 'Lambda integration pattern for: {{trigger}}.',
    options: [
      { text: 'Native event-source mapping (S3, DDB Streams, SQS, EventBridge) or Lambda authorizer (API Gateway), each with appropriate concurrency, batch size, and DLQ configuration.', correct: true },
      { text: 'A single polling Lambda querying every source on a 1-minute timer.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Native event triggers are pushed by AWS — no polling needed.' } },
      { text: 'EC2 cron job triggering Lambdas via the Invoke API.', correct: false, distractor: { type: 'compute-when-serverless-fits', explanation: 'EventBridge Scheduler replaces cron-on-EC2.' } },
      { text: 'A custom EventBridge Pipe in front of every native event source.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'Native triggers already exist; Pipes is for source-to-target enrichment.' } },
    ],
    explanation: 'Lambda has native event-source mappings for S3, DynamoDB Streams, Kinesis, SQS, MSK, plus push-based integrations (API Gateway, ALB, EventBridge, SNS). Configure batch size, batch window, parallelization factor, max retry attempts, and DLQ per source.',
    maxVariants: 5,
  },

  {
    id: 'tpl-426',
    conceptSlug: 'ec2-pricing-models',
    blueprintTaskId: '4.2',
    patternTag: 'most-cost-effective',
    difficulty: 0.5,
    slots: {
      profile: ['steady 24/7 production baseline', 'fault-tolerant batch with flexible deadlines', 'unpredictable spiky workload with idle periods', 'compliance-required dedicated tenancy', 'short experiments lasting hours'],
    },
    stem: 'EC2 pricing model for: {{profile}}.',
    options: [
      { text: 'Savings Plans / RIs for steady, Spot for fault-tolerant batch, On-Demand for unpredictable, Dedicated Hosts/Instances for compliance, On-Demand for short experiments.', correct: true },
      { text: 'Pure On-Demand for every scenario regardless of cost profile.', correct: false, distractor: { type: 'ignores-cost-in-multi-region', explanation: 'Up to 72% savings missed by ignoring commitments and Spot.' } },
      { text: '3-year all-upfront RIs for spiky and short experiments.', correct: false, distractor: { type: 'static-when-dynamic-needed', explanation: 'RIs lock in capacity that goes unused.' } },
      { text: 'Spot Instances for compliance-required dedicated workloads.', correct: false, distractor: { type: 'misses-compliance-requirement', explanation: 'Spot has no tenancy guarantees.' } },
    ],
    explanation: 'Match pricing model to workload shape: Savings Plans (Compute or EC2) and RIs for committed baseline (up to 72% off), Spot for fault-tolerant batch (up to 90% off), Dedicated Hosts/Instances for license-bound or compliance, On-Demand for spiky/short.',
    maxVariants: 5,
  },

  {
    id: 'tpl-427',
    conceptSlug: 'tag-policies',
    blueprintTaskId: '4.4',
    patternTag: 'most-cost-effective',
    difficulty: 0.45,
    slots: {
      goal: ['allocate cost by team across 30 accounts', 'enforce a CostCenter tag on every resource', 'detect untagged resources for cleanup', 'group spend by environment (dev/staging/prod)'],
    },
    stem: 'Best AWS-native tool for: {{goal}}.',
    options: [
      { text: 'AWS Tag Policies (Organizations) to enforce key/value standards, plus Cost Allocation Tags activated in Billing for showback.', correct: true },
      { text: 'A spreadsheet maintained by ops listing each resource owner.', correct: false, distractor: { type: 'manual-when-managed-exists', explanation: 'Doesn\'t scale; drifts.' } },
      { text: 'IAM policies denying any tag changes after creation.', correct: false, distractor: { type: 'wrong-encryption-scope', explanation: 'Locks tags but does not enforce taxonomy.' } },
      { text: 'Trusted Advisor cost checks alone with no tagging strategy.', correct: false, distractor: { type: 'over-engineers-solution', explanation: 'TA gives summary; tags drive showback granularity.' } },
    ],
    explanation: 'Tag Policies enforce a tag taxonomy across an Organization (mandatory keys, allowed values, capitalization). Activate Cost Allocation Tags in Billing to break down Cost Explorer / CUR by team, project, environment, etc. Combine with AWS Config rules for missing-tag remediation.',
    maxVariants: 4,
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
