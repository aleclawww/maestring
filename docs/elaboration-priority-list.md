# Elaboration Mode — Priority List for Hand-Authored Content

Currently 1 of 142 concepts has elaboration content seeded (`security-groups-vs-nacls`). This document ranks the next concepts to author.

## Methodology

Ranking applied the four heuristics from the brief in this order of weight:

1. **Confusable pairs (highest).** Concepts whose `confusedWith` field in `lib/knowledge-graph/aws-saa.ts` is mutually-referenced (i.e. they form a confusion cluster of 2-3+ peers). Elaboration forces the user to articulate the *distinguishing mechanism*, which is exactly what static MCQs can't verify. These dominate the top 10.
2. **High difficulty + high-weight domain.** `difficulty >= 0.65` AND in the Secure (30%) or Resilient (26%) domains. Authoring effort amortises over more exam-blueprint surface.
3. **Mechanism-heavy.** Concepts where the gap between "knows the right answer" and "knows *why*" is large — KMS keys/grants vs key policies, AssumeRole trust chains, route propagation, ASG scaling triggers, FSRS-like decay of partition keys, etc.
4. **Foundational.** Lower-difficulty concepts (`vpc-fundamentals`, `iam-fundamentals`, `s3-storage-classes`) that everything else builds on. Worth covering early even though they're not the hardest, because they're prerequisites everyone hits in the first week.

Domain weights used: Secure 30%, Resilient 26%, Performant 24%, Cost 20%.

Authoring time estimate: **low** (< 20 min, one tight mechanism), **medium** (30-45 min, 2-3 sub-concepts to distinguish), **high** (45-60 min, requires comparison table + decision rules across 3+ peers).

## Top Tranche — author these next (rank 1-15)

| Rank | concept_slug | Concept Name | Why it ranks here | Effort |
|---|---|---|---|---|
| 1 | `kms-encryption` | AWS KMS | Mechanism-heavy (envelope encryption, key policies vs grants vs IAM, multi-region keys); difficulty 0.7; Secure domain. Half-knowing KMS is the single most common SAA failure mode. | high |
| 2 | `iam-roles-vs-policies` | IAM Roles vs Policies | Foundational + confusable with `iam-fundamentals` and `cognito`; trust policy vs permission policy is the canonical "I think I get it but I don't" topic. | medium |
| 3 | `vpc-endpoints` | VPC Endpoints (Gateway vs Interface) | Confusable with `vpc-fundamentals` and `vpc-peering`; difficulty 0.7; mechanism (PrivateLink ENI vs route-table entry) is invisible from MCQs. | medium |
| 4 | `transit-gateway` | Transit Gateway | Tight confusion cluster with `vpc-peering` and `direct-connect`; difficulty 0.7; Resilient domain. Route propagation + attachment semantics are mechanism-heavy. | high |
| 5 | `sqs-vs-sns-vs-eventbridge` | SQS vs SNS vs EventBridge | 3-way confusable peer; appears on the exam constantly under different wording (decoupling, fan-out, filtering). Pure mechanism: push vs pull, ordering, replay. | high |
| 6 | `rds-multi-az` | RDS Multi-AZ | Confusable with `rds-read-replicas` and `aurora-global`; foundational; the "HA vs read-scaling vs DR" trichotomy is THE database resilience question on the exam. | medium |
| 7 | `rds-read-replicas` | RDS Read Replicas | Other side of the trichotomy above; async replication semantics + promotion behaviour are mechanism. | medium |
| 8 | `scp-organizations` | SCPs and AWS Organizations | Confusable with `iam-fundamentals` and `iam-roles-vs-policies`; difficulty 0.7; SCPs as a *deny ceiling* (not permission grant) is the textbook conceptual trap. | medium |
| 9 | `s3-storage-classes` | S3 Storage Classes | Foundational; confusable with `s3-lifecycle` and `s3-intelligent-tiering`; the retrieval-fee + min-storage-duration mechanism is rote on the surface but easy to misapply under exam time pressure. | medium |
| 10 | `vpc-fundamentals` | VPC Fundamentals | Foundational prerequisite for ~15 downstream concepts (endpoints, peering, TGW, NAT, flow logs, network firewall). Worth solidifying early. | medium |
| 11 | `ec2-auto-scaling` | Auto Scaling Groups | Mechanism-heavy (target tracking vs step vs simple vs predictive; warmup, cooldown, lifecycle hooks); foundational for resilience. | medium |
| 12 | `route53-routing` | Route 53 Routing Policies | Difficulty 0.7; 7+ routing-policy sub-concepts (simple, weighted, latency, failover, geo, geoproximity, multivalue) that ARE the mechanism — perfect elaboration target. | high |
| 13 | `dr-strategies-rpo-rto` | DR Strategies (Backup-Restore → Multi-Site) | Difficulty 0.7; four discrete strategies with RPO/RTO/cost tradeoffs — pure mechanism mapping. | medium |
| 14 | `kinesis-streams-vs-firehose` | Kinesis Streams vs Firehose | Confusable pair with `sqs-vs-sns-vs-eventbridge`; difficulty 0.7; shards + retention + consumer model is mechanism. | medium |
| 15 | `aurora-global` | Aurora Global Database | Closes the RDS trichotomy with #6/#7; difficulty 0.7; <1s replication + unplanned failover semantics are mechanism. | low |

## Second Tranche — worth doing after the top 15 (rank 16-30)

| Rank | concept_slug | Why second tier |
|---|---|---|
| 16 | `iam-permissions-boundaries` | Difficulty 0.7, mechanism (max-permission ceiling vs SCP), but used less often on exam than #8. |
| 17 | `sts-assume-role` | Difficulty 0.7, deep mechanism (trust policy + session tags + chaining) but advanced — author after #2/#8 land. |
| 18 | `ecs-vs-eks-vs-fargate` | 3-way confusable; high effort but well-covered by static-generator templates already. |
| 19 | `direct-connect` | Confusable with `transit-gateway`/`vpc-peering`; covered partially by #4. |
| 20 | `cognito` | Difficulty 0.7; User Pools vs Identity Pools is the mechanism trap. |
| 21 | `lambda-patterns` | Confusable with `ecs-vs-eks-vs-fargate`; concurrency model is mechanism. |
| 22 | `dynamodb-performance` | DAX + adaptive capacity + global tables — mechanism. |
| 23 | `efs-vs-fsx` | 4-variant decision matrix (Windows / Lustre / ONTAP / OpenZFS). |
| 24 | `cloudfront-caching` | Cache-key + TTL + invalidation mechanism. |
| 25 | `elb-types` | ALB vs NLB vs GWLB; L4 vs L7 mechanism. |
| 26 | `iam-fundamentals` | Foundational but mostly definitional; principal/action/resource/condition mechanism. |
| 27 | `s3-replication` | CRR vs SRR + KMS-encryption replication gotchas. |
| 28 | `s3-security` | Bucket policy vs ACL vs Block Public Access precedence. |
| 29 | `step-functions` | Standard vs Express, Distributed Map mechanism. |
| 30 | `caching-patterns` | Lazy-load vs write-through vs cache-aside — applies across ElastiCache, DAX, CloudFront. |

## Probably skip — don't waste time

These are rote/definitional, used once on the exam, or have no meaningful "mechanism" beyond the keyFacts already in `aws-saa.ts`. An elaboration prompt here would feel like make-work for the user.

- `lightsail` (difficulty 0.3, "is it on the exam?" tier)
- `aws-marketplace`, `service-quotas`, `health-dashboard`, `aws-license-manager`, `aws-proton`, `aws-appconfig` — single-purpose services with no peer to confuse with
- `trusted-advisor`, `compute-optimizer`, `cost-anomaly-pricing-calculator`, `aws-budgets-cost-explorer` — cost tooling, mostly definitional
- `ses-email`, `appflow`, `amplify-hosting`, `quicksight-overview`, `app-runner`, `elastic-beanstalk` — name-recognition services
- `well-architected-framework` — meta/checklist, not a mechanism
- `cloudwatch-metrics-alarms`, `cloudwatch-logs-insights`, `cloudtrail-events`, `ssm-parameter-store`, `ssm-session-manager`, `xray-tracing` — observability primitives, useful but the mechanism is shallow
- `lambda-fundamentals` (difficulty 0.35, covered by `lambda-patterns` / `lambda-performance`)
- `macie`, `inspector`, `detective`, `audit-manager`, `firewall-manager` — security tooling, single-purpose, rare on exam
- `neptune-graph-db`, `documentdb-mongodb`, `specialized-dbs`, `msk-managed-kafka`, `mq-managed-broker` — niche databases / messaging; surface-level on SAA
- `lake-formation-governance`, `glue-catalog-etl`, `emr-overview`, `athena-fundamentals` — analytics tier, light on SAA-C03

## Sanity checks for the founder

- **Already done:** `security-groups-vs-nacls` (rank ~16 if it weren't done — strong confusable pair, foundational).
- **One trichotomy = three entries:** `rds-multi-az` / `rds-read-replicas` / `aurora-global` should be authored together so the distinguishing language stays consistent across the three.
- **Route 53 + DR + HA cluster** (`route53-routing`, `dr-strategies-rpo-rto`, `ha-multi-az-vs-multi-region`): authoring in one sitting lets reusable framings (RPO/RTO, failover trigger) carry across.
- **Cost domain is intentionally light in the top 15.** Cost concepts are mostly definitional, and the 20% exam weight doesn't justify the authoring time over the Secure/Resilient mechanism-heavy targets.
