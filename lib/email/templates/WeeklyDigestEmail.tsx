import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export type WeeklyDigestProps = {
  firstName: string;
  studyUrl: string;
  // 7-day activity
  sessionsWeek: number;
  questionsWeek: number;
  accuracyWeek: number; // 0..1
  minutesWeek: number;
  // Streak + exam
  currentStreak: number;
  daysUntilExam: number | null;
  // Readiness
  readinessNow: number | null;
  readinessDelta: number | null;
  passProbability: number | null; // 0..1
  // Weakness — domain
  weakestDomainName: string | null;
  weakestDomainAccuracy: number | null; // 0..1
  // Weakness — blueprint task
  weakestTaskId: string | null;
  weakestTaskLabel: string | null;
  // Forward looking
  dueNext7d: number;
  // Simulator highlight
  bestExamScaled: number | null;
  bestExamPassed: boolean | null;
};

export function WeeklyDigestEmail(props: WeeklyDigestProps) {
  const {
    firstName,
    studyUrl,
    sessionsWeek,
    questionsWeek,
    accuracyWeek,
    minutesWeek,
    currentStreak,
    daysUntilExam,
    readinessNow,
    readinessDelta,
    passProbability,
    weakestDomainName,
    weakestDomainAccuracy,
    weakestTaskId,
    weakestTaskLabel,
    dueNext7d,
    bestExamScaled,
    bestExamPassed,
  } = props;

  const accuracyPct = Math.round(accuracyWeek * 100);
  const passPct = passProbability != null ? Math.round(passProbability * 100) : null;
  const deltaLabel =
    readinessDelta == null
      ? null
      : readinessDelta > 0
      ? `+${readinessDelta}`
      : readinessDelta < 0
      ? `${readinessDelta}`
      : "±0";
  const deltaColor =
    readinessDelta == null
      ? "#a1a1aa"
      : readinessDelta > 0
      ? "#10b981"
      : readinessDelta < 0
      ? "#ef4444"
      : "#a1a1aa";

  const previewText =
    sessionsWeek === 0
      ? `${firstName}, your study week was empty (${dueNext7d} reviews waiting)`
      : `Your Maestring week — ${questionsWeek} questions, ${accuracyPct}% correct`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly recap, {firstName}</Heading>
          {daysUntilExam != null && (
            <Text style={dim}>
              📅 Exam in{" "}
              <strong style={{ color: "#ffffff" }}>{daysUntilExam} days</strong>
              {passPct != null ? ` · P(pass) ${passPct}%` : ""}
            </Text>
          )}

          {/* 2×2 stats grid */}
          <Section style={statsWrap}>
            <Row>
              <Column style={statCell}>
                <Text style={statValue}>{sessionsWeek}</Text>
                <Text style={statLabel}>Sessions</Text>
              </Column>
              <Column style={statCell}>
                <Text style={statValue}>{questionsWeek}</Text>
                <Text style={statLabel}>Questions</Text>
              </Column>
            </Row>
            <Row>
              <Column style={statCell}>
                <Text style={statValue}>{accuracyPct}%</Text>
                <Text style={statLabel}>Accuracy</Text>
              </Column>
              <Column style={statCell}>
                <Text style={statValue}>{minutesWeek} min</Text>
                <Text style={statLabel}>Time studied</Text>
              </Column>
            </Row>
          </Section>

          {currentStreak > 0 && (
            <Section style={streakPill}>
              <Text style={streakText}>🔥 {currentStreak}-day streak</Text>
            </Section>
          )}

          {readinessNow != null && (
            <Section style={readinessBox}>
              <Text style={cardLabel}>Readiness Score</Text>
              <Text style={readinessValue}>
                {readinessNow}
                {deltaLabel && (
                  <span style={{ color: deltaColor, fontSize: "14px", marginLeft: "8px" }}>
                    ({deltaLabel} this week)
                  </span>
                )}
              </Text>
            </Section>
          )}

          {weakestDomainName && weakestDomainAccuracy != null && (
            <Section style={weakBox}>
              <Text style={cardLabel}>Weakest domain this week</Text>
              <Text style={weakDomainName}>{weakestDomainName}</Text>
              <Text style={dim}>
                Accuracy: {Math.round(weakestDomainAccuracy * 100)}% — two focused sessions here
                will lift your Readiness fast.
              </Text>
            </Section>
          )}

          {weakestTaskId && weakestTaskLabel && (
            <Section style={weakTaskBox}>
              <Text style={cardLabel}>Weakest exam task</Text>
              <Text style={weakTaskId}>{weakestTaskId}</Text>
              <Text style={weakDomainName}>{weakestTaskLabel}</Text>
            </Section>
          )}

          {bestExamScaled != null && (
            <Section style={examBox}>
              <Text style={cardLabel}>Best practice exam (last 4 weeks)</Text>
              <Text style={examScore}>
                {bestExamScaled}{" "}
                <span style={{ color: bestExamPassed ? "#10b981" : "#ef4444", fontSize: "14px" }}>
                  {bestExamPassed ? "· Passed" : "· Not yet"}
                </span>
              </Text>
            </Section>
          )}

          <Section style={btnSection}>
            <Button href={studyUrl} style={button}>
              {dueNext7d > 0 ? `Study now (${dueNext7d} reviews)` : "Open Maestring"} →
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Maestring · AI-powered adaptive AWS prep.
            <br />
            <a href={`${studyUrl}/settings/notifications`} style={{ color: "#6366f1" }}>
              Unsubscribe from weekly digest
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WeeklyDigestEmail;

// ── styles ────────────────────────────────────────────────────────────────────
const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const h1 = { color: "#ffffff", fontSize: "26px", fontWeight: "700", marginBottom: "4px" };
const dim = { color: "#a1a1aa", fontSize: "14px", lineHeight: "22px", margin: "4px 0 16px" };
const statsWrap = { backgroundColor: "#15172a", borderRadius: "12px", padding: "12px", margin: "20px 0" };
const statCell = { padding: "12px", textAlign: "center" as const };
const statValue = { color: "#ffffff", fontSize: "24px", fontWeight: "700", margin: 0 };
const statLabel = { color: "#71717a", fontSize: "12px", margin: "2px 0 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const streakPill = { backgroundColor: "#1e1e2e", borderRadius: "100px", padding: "8px 16px", display: "inline-block", marginBottom: "16px" };
const streakText = { color: "#f59e0b", fontSize: "14px", fontWeight: "600", margin: 0 };
const readinessBox = { backgroundColor: "#15172a", borderRadius: "12px", padding: "16px", margin: "12px 0", border: "1px solid #6366f133" };
const readinessValue = { color: "#ffffff", fontSize: "30px", fontWeight: "700", margin: "4px 0 0" };
const weakBox = { backgroundColor: "#15172a", borderRadius: "12px", padding: "16px", margin: "12px 0", border: "1px solid #ef444433" };
const weakDomainName = { color: "#ffffff", fontSize: "18px", fontWeight: "600", margin: "4px 0" };
const weakTaskBox = { backgroundColor: "#15172a", borderRadius: "12px", padding: "16px", margin: "12px 0", border: "1px solid #f59e0b33" };
const weakTaskId = { color: "#f59e0b", fontSize: "13px", fontWeight: "700", fontFamily: "monospace", margin: "0 0 2px" };
const examBox = { backgroundColor: "#15172a", borderRadius: "12px", padding: "16px", margin: "12px 0" };
const examScore = { color: "#ffffff", fontSize: "24px", fontWeight: "700", margin: "4px 0 0" };
const cardLabel = { color: "#71717a", fontSize: "11px", margin: 0, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const btnSection = { textAlign: "center" as const, margin: "28px 0" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "12px", textAlign: "center" as const, lineHeight: "18px" };
