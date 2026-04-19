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

type WelcomeEmailProps = {
  firstName: string;
  studyUrl: string;
  examDate?: string;
};

export function WelcomeEmail({ firstName, studyUrl, examDate }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Maestring — your AWS SAA journey starts now</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Maestring, {firstName}! 🎉</Heading>
          <Text style={text}>
            You're one step closer to passing the AWS Solutions Architect Associate exam.
          </Text>
          {examDate && (
            <Section style={callout}>
              <Text style={calloutText}>
                📅 Your exam is on <strong>{examDate}</strong>. Let's make every study session count.
              </Text>
            </Section>
          )}
          <Text style={text}>Here's what you can do right now:</Text>
          <Text style={listItem}>✅ Start your first adaptive study session</Text>
          <Text style={listItem}>📚 Upload AWS documentation PDFs to expand your question bank</Text>
          <Text style={listItem}>📊 Track your progress across all 4 exam domains</Text>
          <Section style={btnSection}>
            <Button href={studyUrl} style={button}>
              Start Studying Now →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Maestring · AWS Certification Prep · You're receiving this because you signed up at maestring.app
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const h1 = { color: "#ffffff", fontSize: "28px", fontWeight: "700", marginBottom: "16px" };
const text = { color: "#a1a1aa", fontSize: "16px", lineHeight: "24px", marginBottom: "12px" };
const listItem = { color: "#a1a1aa", fontSize: "15px", lineHeight: "24px", paddingLeft: "4px" };
const callout = { backgroundColor: "#1e1e2e", borderLeft: "4px solid #6366f1", padding: "16px", borderRadius: "8px", margin: "20px 0" };
const calloutText = { color: "#e4e4e7", fontSize: "15px", margin: 0 };
const btnSection = { textAlign: "center" as const, margin: "32px 0" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const hr = { borderColor: "#27272a", margin: "32px 0" };
const footer = { color: "#52525b", fontSize: "13px", textAlign: "center" as const };
