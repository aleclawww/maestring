import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

type WelcomeEmailProps = {
  firstName: string;
  studyUrl: string;
  examDate?: string;
};

export function WelcomeEmail({ firstName, studyUrl, examDate }: WelcomeEmailProps) {
  const appUrl = studyUrl.replace("/study", "");
  return (
    <Html>
      <Head />
      <Preview>the only thing that matters in your first session</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>Hey {firstName},</Text>
          <Text style={text}>
            Thanks for trying Maestring. You have 7 days of Pro, no card on file.
            I&apos;ll send you four more emails — short ones, no upsell theater — and then you decide.
          </Text>
          <Text style={text}>Here&apos;s the only thing that matters today:</Text>
          <Text style={{ ...text, fontWeight: "700", color: "#ffffff" }}>
            Run one study session before you close the tab.
          </Text>
          {examDate && (
            <Section style={callout}>
              <Text style={calloutText}>
                📅 Your exam: <strong>{examDate}</strong> — your Readiness Score will track your trajectory toward it.
              </Text>
            </Section>
          )}
          <Section style={btnSection}>
            <Button href={studyUrl} style={button}>
              Start my first session →
            </Button>
          </Section>
          <Text style={text}>
            It takes 6 minutes. The first 5 questions are easy on purpose — Maestring is calibrating to you.
            By question 6 you&apos;ll see Claude generate a question targeting whatever you got wrong,
            anchored to either an AWS doc or a PDF you upload. That&apos;s the loop.
          </Text>
          <Text style={text}>
            If you don&apos;t get a &quot;huh, this is different&quot; feeling in 6 minutes,
            the rest of these emails won&apos;t change your mind.
          </Text>
          <Text style={text}>
            Reply to this email if anything breaks. It comes to my actual inbox.
          </Text>
          <Text style={signature}>
            Alec{"\n"}
            Founder, Maestring
          </Text>
          <Text style={ps}>
            P.S. The Readiness Score doesn&apos;t show a real number until you&apos;ve answered ~30 questions
            across at least 2 sessions. Don&apos;t trust the number on Day 1 — it&apos;s a noise floor.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Maestring · <a href={appUrl} style={footerLink}>maestring.com</a> ·{" "}
            <a href={`${appUrl}/settings`} style={footerLink}>Manage emails</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const text = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const callout = { backgroundColor: "#1a1a2e", borderLeft: "3px solid #6366f1", padding: "14px 16px", borderRadius: "6px", margin: "20px 0" };
const calloutText = { color: "#e4e4e7", fontSize: "14px", margin: 0 };
const btnSection = { textAlign: "center" as const, margin: "28px 0" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "15px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const signature = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px", whiteSpace: "pre-line" as const };
const ps = { color: "#71717a", fontSize: "13px", lineHeight: "1.5", fontStyle: "italic", marginBottom: "24px" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "12px", textAlign: "center" as const };
const footerLink = { color: "#6366f1", textDecoration: "none" };
