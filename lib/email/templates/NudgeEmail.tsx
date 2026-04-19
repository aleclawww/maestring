import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type NudgeEmailProps = {
  firstName: string;
  dueCount: number;
  streakDays: number;
  studyUrl: string;
  examDate?: string;
  daysUntilExam?: number;
  // Pilar 5 — reactivación con contexto real (no genérico).
  // Si están presentes, el email muestra la pérdida concreta de readiness:
  // "tu Readiness bajó de 68 a 58, 3 sesiones de 15 min y vuelves al 65+".
  readinessNow?: number;
  readinessPrev?: number;
  weakestDomain?: string;
};

export function NudgeEmail({
  firstName,
  dueCount,
  streakDays,
  studyUrl,
  examDate,
  daysUntilExam,
  readinessNow,
  readinessPrev,
  weakestDomain,
}: NudgeEmailProps) {
  const readinessDelta =
    typeof readinessNow === "number" && typeof readinessPrev === "number"
      ? Math.round(readinessNow - readinessPrev)
      : null;
  const urgency = daysUntilExam && daysUntilExam <= 7 ? "high" : daysUntilExam && daysUntilExam <= 30 ? "medium" : "low";

  const subject = urgency === "high"
    ? `⚡ ${dueCount} cards due — exam in ${daysUntilExam} days!`
    : streakDays > 0
    ? `🔥 Keep your ${streakDays}-day streak — ${dueCount} cards waiting`
    : `📚 ${dueCount} cards ready for review, ${firstName}`;

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {streakDays > 0 && (
            <Section style={streakBadge}>
              <Text style={streakText}>🔥 {streakDays}-day streak</Text>
            </Section>
          )}
          <Heading style={h1}>
            {urgency === "high" ? "⚡ Exam mode activated" : `Hey ${firstName}, time to study!`}
          </Heading>
          <Text style={text}>
            You have <strong style={{ color: "#6366f1" }}>{dueCount} cards</strong> due for review today.
            {daysUntilExam && ` Your exam is in ${daysUntilExam} days.`}
          </Text>
          {readinessDelta !== null && readinessDelta < 0 && (
            <Text style={text}>
              Tu <strong>Readiness Score</strong> bajó de {readinessPrev} a {readinessNow}
              {weakestDomain ? ` — el dominio más afectado es ${weakestDomain}.` : "."}{" "}
              3 sesiones de 15 min esta semana lo recuperan.
            </Text>
          )}
          {readinessDelta === null && (
            <Text style={text}>
              Spaced repetition only works if you show up. Even 10 minutes moves the needle.
            </Text>
          )}
          <Section style={btnSection}>
            <Button href={studyUrl} style={button}>
              Review {dueCount} Cards →
            </Button>
          </Section>
          {examDate && (
            <>
              <Hr style={hr} />
              <Text style={footer}>📅 Exam scheduled: {examDate}</Text>
            </>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            Maestring · <a href="{studyUrl}/settings/notifications" style={{ color: "#6366f1" }}>Manage email preferences</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default NudgeEmail;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const streakBadge = { backgroundColor: "#1e1e2e", borderRadius: "100px", padding: "8px 16px", display: "inline-block", marginBottom: "24px" };
const streakText = { color: "#f59e0b", fontSize: "14px", fontWeight: "600", margin: 0 };
const h1 = { color: "#ffffff", fontSize: "26px", fontWeight: "700", marginBottom: "16px" };
const text = { color: "#a1a1aa", fontSize: "16px", lineHeight: "24px", marginBottom: "12px" };
const btnSection = { textAlign: "center" as const, margin: "32px 0" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "13px", textAlign: "center" as const };
