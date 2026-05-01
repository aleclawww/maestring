import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

const VALID_WEEKS = [4, 6, 8, 10, 12] as const;
type ValidWeeks = (typeof VALID_WEEKS)[number];

type Props = { params: { weeks: string } };

function getWeeks(raw: string): ValidWeeks | null {
  const n = parseInt(raw, 10);
  return (VALID_WEEKS as readonly number[]).includes(n) ? (n as ValidWeeks) : null;
}

export function generateStaticParams() {
  return VALID_WEEKS.map((w) => ({ weeks: String(w) }));
}

export function generateMetadata({ params }: Props): Metadata {
  const weeks = getWeeks(params.weeks);
  if (!weeks) return {};

  const title = `AWS SAA-C03 ${weeks}-Week Study Plan (2025) | Maestring`;
  const description =
    weeks <= 6
      ? `Compressed ${weeks}-week AWS SAA-C03 study plan for engineers with 1–2 hours/day. Spaced repetition schedule, domain priorities, and daily question targets to pass on the first attempt.`
      : `${weeks}-week AWS SAA-C03 study plan designed for professionals with limited daily study time. Adaptive schedule using spaced repetition so nothing falls out of memory before exam day.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    alternates: {
      canonical: `https://maestring.com/study-plan/${weeks}`,
    },
  };
}

const DOMAINS = [
  { name: "Design Secure Architectures", weight: 30, color: "#6366f1" },
  { name: "Design Resilient Architectures", weight: 26, color: "#22d3ee" },
  { name: "Design High-Performing Architectures", weight: 24, color: "#f59e0b" },
  { name: "Design Cost-Optimized Architectures", weight: 20, color: "#34d399" },
] as const;

type WeekPlan = {
  week: number;
  theme: string;
  domains: string[];
  dailyGoal: string;
  milestone: string;
};

function buildPlan(totalWeeks: ValidWeeks): WeekPlan[] {
  const plans: Record<ValidWeeks, WeekPlan[]> = {
    4: [
      { week: 1, theme: "Foundations — IAM, VPC, EC2", domains: ["Design Secure Architectures"], dailyGoal: "30 questions/day, 2 sessions", milestone: "IAM policies + VPC routing mastered" },
      { week: 2, theme: "Compute, Storage, Databases", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "35 questions/day, 2 sessions", milestone: "S3/EBS/RDS/Aurora concepts locked" },
      { week: 3, theme: "Decoupling, Serverless, CDN", domains: ["Design High-Performing Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "40 questions/day, 2 sessions", milestone: "SQS/SNS/Lambda/CloudFront fluent" },
      { week: 4, theme: "Full-domain review + exam readiness", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "50 questions/day, 2–3 sessions", milestone: "Readiness Score ≥ 80 before booking" },
    ],
    6: [
      { week: 1, theme: "IAM, Organizations, SCP", domains: ["Design Secure Architectures"], dailyGoal: "20 questions/day", milestone: "Identity and access control clear" },
      { week: 2, theme: "Networking — VPC, Transit Gateway, Route 53", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "25 questions/day", milestone: "Multi-AZ + hybrid connectivity mapped" },
      { week: 3, theme: "Compute + Auto Scaling + Load Balancers", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "25 questions/day", milestone: "EC2/ASG/ALB/NLB patterns understood" },
      { week: 4, theme: "Storage, Databases, Analytics", domains: ["Design High-Performing Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "30 questions/day", milestone: "Right-service-for-the-scenario reliable" },
      { week: 5, theme: "Serverless, Messaging, Monitoring", domains: ["Design Resilient Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "30 questions/day", milestone: "Event-driven patterns solid" },
      { week: 6, theme: "Full review + weak-spot targeting", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "40 questions/day", milestone: "Readiness Score ≥ 82 before booking" },
    ],
    8: [
      { week: 1, theme: "IAM deep-dive: policies, roles, SCPs, Cognito", domains: ["Design Secure Architectures"], dailyGoal: "15 questions/day", milestone: "Write any policy from memory" },
      { week: 2, theme: "VPC, subnets, NACLs, security groups, endpoints", domains: ["Design Secure Architectures"], dailyGoal: "20 questions/day", milestone: "Draw a 3-tier VPC in 5 minutes" },
      { week: 3, theme: "Compute: EC2 families, Spot, Reserved, ASG", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "20 questions/day", milestone: "Cost vs latency tradeoffs clear" },
      { week: 4, theme: "Storage: S3 classes, lifecycle, EBS, EFS, FSx", domains: ["Design High-Performing Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "25 questions/day", milestone: "Storage selection matrix mastered" },
      { week: 5, theme: "Databases: RDS, Aurora, DynamoDB, ElastiCache", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "25 questions/day", milestone: "Multi-region + caching patterns locked" },
      { week: 6, theme: "Serverless, SQS/SNS/EventBridge, Step Functions", domains: ["Design Cost-Optimized Architectures", "Design Resilient Architectures"], dailyGoal: "25 questions/day", milestone: "Async architectures fluent" },
      { week: 7, theme: "CDN, DNS, Global Accelerator, migrations", domains: ["Design High-Performing Architectures"], dailyGoal: "30 questions/day", milestone: "Latency + migration scenario questions correct" },
      { week: 8, theme: "Full-domain review, exam simulation", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "40 questions/day", milestone: "Readiness Score ≥ 85 before booking" },
    ],
    10: [
      { week: 1, theme: "AWS fundamentals: regions, AZs, shared responsibility", domains: ["Design Secure Architectures"], dailyGoal: "10 questions/day", milestone: "Exam structure + format understood" },
      { week: 2, theme: "IAM — users, groups, roles, policies, Cognito", domains: ["Design Secure Architectures"], dailyGoal: "15 questions/day", milestone: "Policy evaluation logic clear" },
      { week: 3, theme: "VPC architecture, hybrid connectivity, Route 53", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "15 questions/day", milestone: "Network design decisions reliable" },
      { week: 4, theme: "Compute: EC2, Lambda, ECS, EKS, Batch", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "20 questions/day", milestone: "Compute selection scenarios clear" },
      { week: 5, theme: "Storage deep-dive: S3, EBS, EFS, FSx, Snow*", domains: ["Design High-Performing Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "20 questions/day", milestone: "Storage class lifecycle + cost trade-offs" },
      { week: 6, theme: "Databases: RDS Multi-AZ, Aurora Global, DynamoDB, RedShift", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "20 questions/day", milestone: "Database selection + replication mastered" },
      { week: 7, theme: "Messaging: SQS, SNS, Kinesis, EventBridge, MQ", domains: ["Design Resilient Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "25 questions/day", milestone: "Event-driven decoupling patterns solid" },
      { week: 8, theme: "Monitoring, security tooling, compliance (CloudTrail, GuardDuty, Config)", domains: ["Design Secure Architectures"], dailyGoal: "25 questions/day", milestone: "Security service selection automatic" },
      { week: 9, theme: "Cost optimization, Trusted Advisor, migrations, DR", domains: ["Design Cost-Optimized Architectures"], dailyGoal: "30 questions/day", milestone: "RPO/RTO + cost scenarios reliable" },
      { week: 10, theme: "Full-domain review, weak-spot sessions", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "40 questions/day", milestone: "Readiness Score ≥ 85 before booking" },
    ],
    12: [
      { week: 1, theme: "AWS global infrastructure, shared responsibility model", domains: ["Design Secure Architectures"], dailyGoal: "10 questions/day", milestone: "Mental model of AWS ownership clear" },
      { week: 2, theme: "IAM core — policies, trust relationships, permission boundaries", domains: ["Design Secure Architectures"], dailyGoal: "10 questions/day", milestone: "IAM policy logic debuggable" },
      { week: 3, theme: "IAM advanced — Organizations, SCP, Cognito, Directory Service", domains: ["Design Secure Architectures"], dailyGoal: "15 questions/day", milestone: "Multi-account governance clear" },
      { week: 4, theme: "VPC — subnets, routing, NACLs, security groups, endpoints", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "15 questions/day", milestone: "VPC design from scratch" },
      { week: 5, theme: "Hybrid networking — VPN, Direct Connect, Transit Gateway", domains: ["Design Resilient Architectures"], dailyGoal: "15 questions/day", milestone: "On-prem to AWS connectivity trade-offs" },
      { week: 6, theme: "Compute deep-dive: EC2, ASG, ELB, Lambda, ECS", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "20 questions/day", milestone: "Scaling + HA architecture patterns clear" },
      { week: 7, theme: "Storage: S3 lifecycle, Intelligent-Tiering, EBS types, EFS, FSx", domains: ["Design High-Performing Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "20 questions/day", milestone: "Storage cost optimization strategies" },
      { week: 8, theme: "Databases: RDS, Aurora, DynamoDB, ElastiCache, Neptune", domains: ["Design Resilient Architectures", "Design High-Performing Architectures"], dailyGoal: "20 questions/day", milestone: "Database replication + failover scenarios" },
      { week: 9, theme: "Serverless, messaging, analytics (Kinesis, Athena, Glue, EMR)", domains: ["Design High-Performing Architectures", "Design Cost-Optimized Architectures"], dailyGoal: "25 questions/day", milestone: "Event-driven + data pipeline architectures" },
      { week: 10, theme: "Security tooling: WAF, Shield, GuardDuty, Macie, Inspector", domains: ["Design Secure Architectures"], dailyGoal: "25 questions/day", milestone: "Security service selection automatic" },
      { week: 11, theme: "Cost optimization, migrations, DR strategies (RTO/RPO)", domains: ["Design Cost-Optimized Architectures"], dailyGoal: "30 questions/day", milestone: "Cost + DR scenario questions reliable" },
      { week: 12, theme: "Full-domain review, weak-spot targeting, exam simulation", domains: ["Design Secure Architectures", "Design Resilient Architectures"], dailyGoal: "40 questions/day", milestone: "Readiness Score ≥ 85 before booking" },
    ],
  };

  return plans[totalWeeks];
}

const studyPlanJsonLd = (weeks: ValidWeeks) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: `AWS SAA-C03 ${weeks}-Week Study Plan`,
  description: `Step-by-step ${weeks}-week study plan for passing the AWS Solutions Architect Associate (SAA-C03) exam using spaced repetition.`,
  totalTime: `P${weeks}W`,
  supply: [
    { "@type": "HowToSupply", name: "Maestring Pro (free 7-day trial)" },
    { "@type": "HowToSupply", name: "AWS SAA-C03 exam registration ($150)" },
  ],
  tool: [
    { "@type": "HowToTool", name: "FSRS-4.5 spaced repetition scheduler" },
    { "@type": "HowToTool", name: "AI adaptive question generator" },
  ],
  step: buildPlan(weeks).map((w) => ({
    "@type": "HowToStep",
    name: `Week ${w.week}: ${w.theme}`,
    text: `${w.dailyGoal}. Milestone: ${w.milestone}`,
  })),
});

const faqJsonLd = (weeks: ValidWeeks) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: `Is ${weeks} weeks enough to pass AWS SAA-C03?`,
      acceptedAnswer: {
        "@type": "Answer",
        text:
          weeks <= 4
            ? `${weeks} weeks is aggressive but achievable for engineers with prior AWS exposure and 2+ hours/day. The key is using spaced repetition from day one — passive reading will not stick in a ${weeks}-week window.`
            : `${weeks} weeks gives you enough time to build durable memory across all four exam domains without burning out. With 1–1.5 hours/day and consistent daily sessions, most engineers hit 80+ Readiness Score before exam day.`,
      },
    },
    {
      "@type": "Question",
      name: "Which domains should I prioritize first?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Start with Design Secure Architectures (30% of the exam) — IAM mistakes kill more first-attempt candidates than any other domain. Networking (VPC) is second. Once those are solid, the Resilient and High-Performing domains build naturally on top.",
      },
    },
    {
      "@type": "Question",
      name: "How many practice questions per day do I need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Early weeks: 15–25 questions/day while building new concepts. Final weeks: 35–50 questions/day in review mode. More important than volume is daily consistency — the spaced repetition scheduler requires daily sessions to keep intervals optimal. Missing 2+ days in a row resets your recall curve.`,
      },
    },
    {
      "@type": "Question",
      name: "Should I use Stephane Maarek's course alongside this plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, but use video as a first-pass intro to unfamiliar services, not as your primary study method. Watch a section once, then immediately reinforce it with adaptive questions in Maestring. Rewatching videos is one of the least efficient ways to consolidate exam-relevant memory.",
      },
    },
  ],
});

export default function StudyPlanPage({ params }: Props) {
  const weeks = getWeeks(params.weeks);
  if (!weeks) notFound();

  const plan = buildPlan(weeks);
  const totalQuestions = plan.reduce((sum, w) => {
    const match = w.dailyGoal.match(/(\d+)/);
    return sum + (match?.[1] ? parseInt(match[1], 10) * 7 : 0);
  }, 0);

  const intensity = weeks <= 4 ? "Intensive" : weeks <= 6 ? "Accelerated" : weeks <= 8 ? "Standard" : "Relaxed";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(studyPlanJsonLd(weeks)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(weeks)) }}
      />

      <div style={{ backgroundColor: "#0f1117", minHeight: "100vh", color: "#a1a1aa", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
        {/* Nav */}
        <nav style={{ borderBottom: "1px solid #27272a", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "900px", margin: "0 auto" }}>
          <Link href="/" style={{ color: "#ffffff", fontWeight: 700, fontSize: "18px", textDecoration: "none" }}>
            Maestring
          </Link>
          <Link
            href="/signup"
            style={{ backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
          >
            Start free
          </Link>
        </nav>

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 24px" }}>
          {/* Breadcrumb */}
          <p style={{ fontSize: "13px", color: "#52525b", marginBottom: "24px" }}>
            <Link href="/" style={{ color: "#52525b", textDecoration: "none" }}>Maestring</Link>
            {" / "}
            <span>Study Plans</span>
            {" / "}
            <span style={{ color: "#a1a1aa" }}>{weeks}-Week Plan</span>
          </p>

          {/* Hero */}
          <div style={{ marginBottom: "48px" }}>
            <div style={{ display: "inline-block", backgroundColor: "#1a1a2e", border: "1px solid #3f3f46", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#6366f1", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {intensity} · {weeks} weeks
            </div>
            <h1 style={{ color: "#ffffff", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px" }}>
              AWS SAA-C03 {weeks}-Week Study Plan
            </h1>
            <p style={{ fontSize: "18px", lineHeight: 1.6, maxWidth: "600px", marginBottom: "32px" }}>
              A day-by-day framework for passing the AWS Solutions Architect Associate exam in {weeks} weeks —
              built around spaced repetition, not passive reading.
            </p>

            {/* Stats bar */}
            <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", marginBottom: "40px" }}>
              {[
                { label: "Total weeks", value: String(weeks) },
                { label: "~Est. questions", value: `${totalQuestions.toLocaleString()}+` },
                { label: "Hours/day", value: weeks <= 4 ? "2–3h" : weeks <= 6 ? "1.5–2h" : "1–1.5h" },
                { label: "Exam cost", value: "$150" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: "13px", color: "#52525b" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              style={{ display: "inline-block", backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 32px", fontSize: "15px", fontWeight: 700, textDecoration: "none" }}
            >
              Follow this plan free for 7 days →
            </Link>
          </div>

          {/* Domain weights */}
          <div style={{ marginBottom: "48px" }}>
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>
              SAA-C03 Exam Domain Weights
            </h2>
            <div style={{ display: "grid", gap: "12px" }}>
              {DOMAINS.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "200px", fontSize: "13px", color: "#a1a1aa", flexShrink: 0 }}>{d.name}</div>
                  <div style={{ flex: 1, backgroundColor: "#27272a", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div style={{ width: `${d.weight / 30 * 100}%`, height: "100%", backgroundColor: d.color, borderRadius: "4px" }} />
                  </div>
                  <div style={{ width: "36px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>{d.weight}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Week-by-week plan */}
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
              Week-by-Week Schedule
            </h2>
            <p style={{ fontSize: "14px", marginBottom: "32px" }}>
              Each week focuses on one exam domain cluster. Complete your due Maestring sessions daily —
              the FSRS algorithm resurfaces concepts exactly when they&apos;re about to decay.
            </p>

            <div style={{ display: "grid", gap: "16px" }}>
              {plan.map((w) => (
                <div
                  key={w.week}
                  style={{
                    border: "1px solid #27272a",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "grid",
                    gridTemplateColumns: "64px 1fr",
                    gap: "16px",
                    alignItems: "start",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#6366f1", fontWeight: 800, fontSize: "22px" }}>W{w.week}</div>
                  </div>
                  <div>
                    <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>{w.theme}</div>
                    <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                      <span style={{ color: "#6366f1" }}>●</span>{" "}
                      <span>{w.dailyGoal}</span>
                    </div>
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "#34d399" }}>✓</span>{" "}
                      <span>Milestone: {w.milestone}</span>
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {w.domains.map((d) => (
                        <span
                          key={d}
                          style={{ backgroundColor: "#1a1a2e", border: "1px solid #3f3f46", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#a1a1aa" }}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How Maestring fits in */}
          <div style={{ backgroundColor: "#1a1a2e", borderRadius: "16px", padding: "36px", marginBottom: "64px", borderLeft: "4px solid #6366f1" }}>
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>
              How to use this plan with Maestring
            </h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {[
                { step: "1", text: "Sign up free — you get 7 days of Pro with no card required." },
                { step: "2", text: "Set your exam date. Your Readiness Score will track your trajectory toward it in real time." },
                { step: "3", text: "Start a daily session. Maestring selects which concept is most due for review based on FSRS-4.5, so you never study what you already know." },
                { step: "4", text: "Upload one PDF from your existing study materials (Tutorials Dojo cheatsheet, your own VPC notes). Every generated question anchors to your source." },
                { step: "5", text: "Check your Readiness Score weekly. Book the exam when it reads 82+. Do not book before." },
              ].map((item) => (
                <div key={item.step} style={{ display: "flex", gap: "16px", alignItems: "start" }}>
                  <div style={{ backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", flexShrink: 0 }}>
                    {item.step}
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{item.text}</p>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              style={{ display: "inline-block", marginTop: "28px", backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}
            >
              Start this plan free →
            </Link>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 700, marginBottom: "28px" }}>
              Frequently asked questions
            </h2>
            <div style={{ display: "grid", gap: "24px" }}>
              {[
                {
                  q: `Is ${weeks} weeks enough to pass AWS SAA-C03?`,
                  a: weeks <= 4
                    ? `${weeks} weeks is aggressive but achievable for engineers with prior AWS exposure and 2+ hours/day. The key is using spaced repetition from day one — passive reading will not stick in a ${weeks}-week window.`
                    : `${weeks} weeks gives you enough time to build durable memory across all four exam domains without burning out. With 1–1.5 hours/day and consistent daily sessions, most engineers hit 80+ Readiness Score before exam day.`,
                },
                {
                  q: "Which domain should I study first?",
                  a: "Design Secure Architectures (30% of exam weight). IAM is the most common point of failure on first attempts — candidates who skip it pay for it in the security-adjacent questions embedded in every other domain.",
                },
                {
                  q: "Do I still need Stephane Maarek's course?",
                  a: "Use it as a first-pass reference for services you've never touched. Watch a section once, then immediately drill it with Maestring. Rewatching videos is one of the least efficient preparation methods — passive recall does not equal retention.",
                },
                {
                  q: "When should I book the exam?",
                  a: "When your Maestring Readiness Score reads 82 or above across at least 3 consecutive sessions. Don't book first and study to a deadline — that's how candidates rush the final week and fail by 5 points.",
                },
              ].map((item) => (
                <div key={item.q} style={{ borderBottom: "1px solid #27272a", paddingBottom: "24px" }}>
                  <h3 style={{ color: "#ffffff", fontSize: "16px", fontWeight: 600, marginBottom: "10px" }}>{item.q}</h3>
                  <p style={{ fontSize: "14px", lineHeight: 1.7, margin: 0 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Other plans */}
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>
              Other study plan lengths
            </h2>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {VALID_WEEKS.filter((w) => w !== weeks).map((w) => (
                <Link
                  key={w}
                  href={`/study-plan/${w}`}
                  style={{ backgroundColor: "#27272a", color: "#e4e4e7", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
                >
                  {w}-week plan
                </Link>
              ))}
            </div>
          </div>

          {/* CTA footer */}
          <div style={{ textAlign: "center", padding: "48px 24px", border: "1px solid #27272a", borderRadius: "16px" }}>
            <h2 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>
              Ready to start your {weeks}-week plan?
            </h2>
            <p style={{ fontSize: "15px", marginBottom: "28px" }}>
              7 days of Pro free — no card required. Your Readiness Score starts tracking from your first session.
            </p>
            <Link
              href="/signup"
              style={{ display: "inline-block", backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "16px 40px", fontSize: "16px", fontWeight: 700, textDecoration: "none" }}
            >
              Start free → first question in 90 seconds
            </Link>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "64px", paddingTop: "24px", borderTop: "1px solid #27272a", textAlign: "center", fontSize: "12px", color: "#52525b" }}>
            <Link href="/" style={{ color: "#52525b", textDecoration: "none" }}>Maestring</Link>
            {" · "}
            <Link href="/pricing" style={{ color: "#52525b", textDecoration: "none" }}>Pricing</Link>
            {" · "}
            <Link href="/alternatives/tutorials-dojo" style={{ color: "#52525b", textDecoration: "none" }}>Alternatives</Link>
            {" · "}
            <Link href="/legal/privacy" style={{ color: "#52525b", textDecoration: "none" }}>Privacy</Link>
          </div>
        </div>
      </div>
    </>
  );
}
