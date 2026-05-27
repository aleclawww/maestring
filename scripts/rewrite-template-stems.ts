import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * One-shot rewrite of fragment-style stems in templates.ts to full,
 * exam-style questions. Run once, review the diff, commit.
 *
 *   tsx scripts/rewrite-template-stems.ts             # rewrites in place
 *   tsx scripts/rewrite-template-stems.ts --dry-run   # prints planned changes
 */

const DRY = process.argv.includes('--dry-run')
const FILE = join(process.cwd(), 'lib', 'question-engine', 'templates.ts')

// Map of old stem → new stem. Each entry must match exactly one stem in the
// file (templates have unique stems). Slot placeholders are preserved
// verbatim; the rewrite only changes the framing prose around them.
const REWRITES: Record<string, string> = {
  // tpl-203
  'Choose the load balancer for {{protocol}}.':
    'Which load balancer should the team use for {{protocol}}?',
  // tpl-208
  'Pick the AWS service mix for an RDS-based DR strategy of type "{{strategy}}".':
    'Which AWS service mix supports an RDS-based DR strategy of type "{{strategy}}"?',
  // tpl-210
  'Choose the EBS volume type for sustained {{iops}} IOPS at {{latency}} latency.':
    'Which EBS volume type supports sustained {{iops}} IOPS at {{latency}} latency?',
  // tpl-211
  'Pick the AWS-managed shared file system for: {{workload}}.':
    'Which AWS-managed shared file system fits {{workload}}?',
  // tpl-212
  'Pick the S3 storage class for data {{access}}.':
    'Which S3 storage class is the best fit for data {{access}}?',
  // tpl-301
  'Reduce latency for {{asset}} served to {{audience}} with origin offload.':
    'Which AWS approach reduces latency for {{asset}} served to {{audience}} with origin offload?',
  // tpl-302
  'Implement {{pattern}} with the lowest latency.':
    'Which approach implements {{pattern}} with the lowest latency?',
  // tpl-303
  'Use Route 53 to {{goal}}.':
    'Which Route 53 configuration should the team use to {{goal}}?',
  // tpl-304
  'Pick the messaging service for: {{pattern}}.':
    'Which AWS messaging service fits {{pattern}}?',
  // tpl-305
  'Implement {{workflow}} with the lowest operational overhead.':
    'Which approach implements {{workflow}} with the lowest operational overhead?',
  // tpl-306
  'Choose the AWS compute primitive for {{workload}}.':
    'Which AWS compute primitive fits {{workload}}?',
  // tpl-310 (Surface ... for cleanup)
  'Surface {{target}} across {{org}} for cleanup with minimal effort.':
    'Which AWS approach surfaces {{target}} across {{org}} for cleanup with minimal effort?',
  // tpl-401
  'Optimise S3 cost for: {{pattern}}.':
    'Which S3 cost-optimization approach fits {{pattern}}?',
  // tpl-402
  'Maximum-discount commitment for: {{mix}}.':
    'Which commitment delivers the maximum discount for {{mix}}?',
  // tpl-404
  'Cheapest Aurora deployment for: {{profile}}.':
    'Which is the cheapest Aurora deployment for {{profile}}?',
  // tpl-405
  'Pick the AWS-native tool for: {{goal}}.':
    'Which AWS-native tool fits {{goal}}?',
  // tpl-406
  'Cut EBS storage spend caused by: {{situation}}.':
    'Which action cuts EBS storage spend caused by {{situation}}?',
  // tpl-407
  'Cost-optimise {{workload}} running on {{cluster}}.':
    'Which approach cost-optimises {{workload}} running on {{cluster}}?',
  // tpl-408
  'Pick the cheapest compute pricing strategy for: {{profile}}.':
    'Which is the cheapest compute pricing strategy for {{profile}}?',
  // tpl-409
  'Most cost-effective Aurora topology for: {{pattern}}.':
    'Which is the most cost-effective Aurora topology for {{pattern}}?',
  // tpl-410
  'Pick the streaming primitive for: {{need}}.':
    'Which streaming primitive fits {{need}}?',
  // tpl-411
  'Solve a DynamoDB performance issue: {{pattern}}.':
    'Which approach resolves a DynamoDB performance issue caused by {{pattern}}?',
  // tpl-412
  'Pick the KMS key strategy to {{need}}.':
    'Which KMS key strategy should the team use to {{need}}?',
  // tpl-414
  'Achieve {{mandate}} on S3 objects.':
    'Which S3 feature achieves {{mandate}}?',
  // tpl-415
  'Best service to {{goal}}.':
    'Which AWS service is the best fit to {{goal}}?',
  // tpl-416
  'TLS strategy for: {{use}}.':
    'Which TLS strategy fits {{use}}?',
  // tpl-417
  'Pick the ElastiCache engine for: {{need}}.':
    'Which ElastiCache engine fits {{need}}?',
  // tpl-418
  '{{problem}} — best fix?':
    'Which AWS approach best fixes the issue: {{problem}}?',
  // tpl-419
  'Mitigate {{symptom}}.':
    'Which action mitigates {{symptom}}?',
  // tpl-420
  'Best orchestration primitive for {{flow}}.':
    'Which AWS orchestration primitive fits {{flow}}?',
  // tpl-421
  'Best EventBridge feature for: {{need}}.':
    'Which EventBridge feature fits {{need}}?',
  // tpl-422
  'Pick the API layer for: {{need}}.':
    'Which API layer fits {{need}}?',
  // tpl-423
  'Route 53 routing policy for: {{goal}}.':
    'Which Route 53 routing policy fits {{goal}}?',
  // tpl-424
  'Database for: {{target}}.':
    'Which AWS database fits {{target}}?',
  // tpl-425
  'DynamoDB resilience feature for: {{need}}.':
    'Which DynamoDB resilience feature fits {{need}}?',
  // tpl-426
  'Centralized backup approach for: {{scope}}.':
    'Which centralized backup approach fits {{scope}}?',
  // tpl-427
  'Define an S3 lifecycle policy for: {{profile}}.':
    'Which S3 lifecycle policy fits {{profile}}?',
  // tpl-428
  'Storage Gateway flavor for: {{need}}.':
    'Which Storage Gateway flavor fits {{need}}?',
  // tpl-429
  'Spot strategy for: {{job}}.':
    'Which Spot strategy fits {{job}}?',
  // tpl-430
  'Best edge fronting for: {{goal}}.':
    'Which AWS edge-fronting service fits {{goal}}?',
  // tpl-431
  'CloudFront security feature for: {{need}}.':
    'Which CloudFront security feature fits {{need}}?',
  // tpl-432
  'Edge compute for: {{logic}}.':
    'Which AWS edge-compute option fits {{logic}}?',
  // tpl-433
  'Redshift feature for: {{need}}.':
    'Which Redshift feature fits {{need}}?',
  // tpl-434
  'Best Glue feature for: {{job}}.':
    'Which AWS Glue feature fits {{job}}?',
  // tpl-435
  'Best fit for: {{goal}}.':
    'Which AWS service is the best fit for {{goal}}?',
  // tpl-436
  'Lake Formation feature for: {{goal}}.':
    'Which Lake Formation feature fits {{goal}}?',
  // tpl-437
  'Cheapest correct S3 tier for: {{access}}.':
    'Which is the cheapest correct S3 tier for {{access}}?',
  // tpl-439
  'Best Savings Plan for: {{profile}}.':
    'Which Savings Plan fits {{profile}}?',
  // tpl-440
  'Service to: {{goal}}.':
    'Which AWS service can be used to {{goal}}?',
  // tpl-441
  'Cheapest correct Aurora option for: {{profile}}.':
    'Which is the cheapest correct Aurora option for {{profile}}?',
  // tpl-442
  'Cut NAT Gateway cost for: {{traffic}}.':
    'Which action cuts NAT Gateway cost for {{traffic}}?',
  // tpl-443 / tpl-447 / tpl-451 share text; use replaceAll-style by doing each unique replace
  'Best AWS-native tool for: {{goal}}.':
    'Which AWS-native tool fits {{goal}}?',
  // tpl-444
  'Best IAM control for: {{scenario}}.':
    'Which IAM control fits {{scenario}}?',
  // tpl-446
  'Best AWS service for: {{goal}}.':
    'Which AWS service fits {{goal}}?',
  // tpl-448
  'Detect {{threat}} — best service?':
    'Which AWS service detects {{threat}}?',
  // tpl-449
  'Cheapest correct connectivity for: {{need}}.':
    'Which is the cheapest correct connectivity option for {{need}}?',
  // tpl-450
  'Best identity primitive for: {{need}}.':
    'Which identity primitive fits {{need}}?',
  // tpl-452
  'Best Organizations control to {{goal}}.':
    'Which Organizations control should the team use to {{goal}}?',
  // tpl-453
  'Cognito feature for: {{need}}.':
    'Which Cognito feature fits {{need}}?',
  // tpl-454
  'Vulnerability scanning of {{target}} — best AWS service?':
    'Which AWS service performs vulnerability scanning of {{target}}?',
  // tpl-455
  'Best primitive for: {{need}}.':
    'Which AWS primitive fits {{need}}?',
  // tpl-456
  'S3 feature for: {{need}}.':
    'Which S3 feature fits {{need}}?',
  // tpl-457
  'S3 replication setup for: {{goal}}.':
    'Which S3 replication setup fits {{goal}}?',
  // tpl-458
  'Best messaging primitive for: {{use}}.':
    'Which AWS messaging primitive fits {{use}}?',
  // tpl-459
  'Auto Scaling configuration for: {{profile}}.':
    'Which Auto Scaling configuration fits {{profile}}?',
  // tpl-460
  'Best load balancer for: {{workload}}.':
    'Which load balancer fits {{workload}}?',
  // tpl-461
  'Best service for: {{transfer}}.':
    'Which AWS service fits {{transfer}}?',
  // tpl-462
  'Best Snow Family device for: {{situation}}.':
    'Which Snow Family device fits {{situation}}?',
  // tpl-463
  'Best EC2 placement group for: {{need}}.':
    'Which EC2 placement group fits {{need}}?',
  // tpl-464
  'Caching strategy for: {{pattern}}.':
    'Which caching strategy fits {{pattern}}?',
  // tpl-465
  'RDS read-replica plan for: {{pattern}}.':
    'Which RDS read-replica plan fits {{pattern}}?',
  // tpl-466
  'Aurora feature for: {{need}}.':
    'Which Aurora feature fits {{need}}?',
  // tpl-467
  'VPC endpoint type for: {{need}}.':
    'Which VPC endpoint type fits {{need}}?',
  // tpl-468
  'CloudFront caching strategy for: {{content}}.':
    'Which CloudFront caching strategy fits {{content}}?',
  // tpl-469
  'Cheapest correct transfer mechanism for: {{transfer}}.':
    'Which is the cheapest correct transfer mechanism for {{transfer}}?',
  // tpl-470
  'Cost optimization action for: {{issue}}.':
    'Which cost-optimization action fits {{issue}}?',
  // tpl-471
  'DynamoDB capacity mode for: {{pattern}}.':
    'Which DynamoDB capacity mode fits {{pattern}}?',
  // tpl-472
  'Cheapest correct caching for: {{need}}.':
    'Which is the cheapest correct caching approach for {{need}}?',
  // tpl-473
  'Cheapest network architecture for: {{goal}}.':
    'Which is the cheapest network architecture for {{goal}}?',
  // tpl-474
  'Best identity solution for: {{need}}.':
    'Which identity solution fits {{need}}?',
  // tpl-475
  'Defense against: {{threat}}.':
    'Which control defends against {{threat}}?',
  // tpl-476
  'Best S3 security control for: {{need}}.':
    'Which S3 security control fits {{need}}?',
  // tpl-477
  'Pick the EC2 family for: {{workload}}.':
    'Which EC2 family fits {{workload}}?',
  // tpl-478
  'Best container service for: {{need}}.':
    'Which container service fits {{need}}?',
  // tpl-479
  'Best serverless compute for: {{workload}}.':
    'Which serverless compute option fits {{workload}}?',
  // tpl-480
  'Lambda integration pattern for: {{trigger}}.':
    'Which Lambda integration pattern fits {{trigger}}?',
  // tpl-481
  'EC2 pricing model for: {{profile}}.':
    'Which EC2 pricing model fits {{profile}}?',
}

const src = readFileSync(FILE, 'utf-8')
let next = src
const report: { old: string; new: string; count: number }[] = []

for (const [oldStem, newStem] of Object.entries(REWRITES)) {
  // The stem is stored as: `stem: '<text>',`. We match the entire quoted
  // string (single quotes) to avoid accidental partial matches inside
  // option text. Escape regex specials in the literal.
  const esc = oldStem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`stem: '${esc}'`, 'g')
  const matches = next.match(re)
  const count = matches?.length ?? 0
  if (count === 0) {
    console.warn(`! No match for: ${oldStem}`)
    continue
  }
  next = next.replace(re, `stem: '${newStem.replace(/'/g, "\\'")}'`)
  report.push({ old: oldStem, new: newStem, count })
}

console.log('Planned rewrites:')
for (const r of report) {
  console.log(`  [${r.count}] ${r.old}`)
  console.log(`         → ${r.new}`)
}
console.log(`\nTotal rewrites: ${report.reduce((a, b) => a + b.count, 0)}`)

if (DRY) {
  console.log('\n--dry-run: not writing file')
  process.exit(0)
}

writeFileSync(FILE, next, 'utf-8')
console.log(`\n✓ Wrote ${FILE}`)
