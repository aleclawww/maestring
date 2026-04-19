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

type StreakBrokenEmailProps = {
  firstName: string;
  previousStreak: number;
  studyUrl: string;
};

export function StreakBrokenEmail({
  firstName,
  previousStreak,
  studyUrl,
}: StreakBrokenEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your ${previousStreak}-day streak ended — but you can bounce back today`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={heroIcon}>💔</Text>
          </Section>
          <Heading style={h1}>Your streak ended, {firstName}</Heading>
          <Text style={text}>
            Your <strong>{previousStreak}-day streak</strong> came to an end. It happens — life gets busy.
          </Text>
          <Text style={text}>
            The good news? Starting a new streak is just one session away. And the knowledge you've built
            doesn't disappear — your FSRS progress is still there, waiting for you.
          </Text>
          <Section style={quote}>
            <Text style={quoteText}>
              "The best time to plant a tree was 20 years ago. The second best time is now."
            </Text>
          </Section>
          <Section style={btnSection}>
            <Button href={studyUrl} style={button}>
              Start a New Streak →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Maestring · AWS Certification Prep</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default StreakBrokenEmail;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const hero = { textAlign: "center" as const, marginBottom: "24px" };
const heroIcon = { fontSize: "48px", margin: 0 };
const h1 = { color: "#ffffff", fontSize: "26px", fontWeight: "700", marginBottom: "16px", textAlign: "center" as const };
const text = { color: "#a1a1aa", fontSize: "16px", lineHeight: "24px", marginBottom: "12px" };
const quote = { backgroundColor: "#1e1e2e", borderLeft: "4px solid #6366f1", padding: "16px", borderRadius: "8px", margin: "20px 0" };
const quoteText = { color: "#e4e4e7", fontSize: "15px", fontStyle: "italic", margin: 0 };
const btnSection = { textAlign: "center" as const, margin: "32px 0" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "13px", textAlign: "center" as const };
