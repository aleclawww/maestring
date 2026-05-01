import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Hr,
  Section,
} from "@react-email/components";
import * as React from "react";

type TrialDay7EmailProps = {
  firstName: string;
  billingUrl: string;
  readinessScore?: number;
  sessionCount?: number;
};

export function TrialDay7Email({ firstName, billingUrl, readinessScore, sessionCount }: TrialDay7EmailProps) {
  const appUrl = billingUrl.replace("/billing", "").replace("/settings", "");
  const annualUrl = billingUrl.includes("?") ? `${billingUrl}&plan=annual` : `${billingUrl}?plan=annual`;

  return (
    <Html>
      <Head />
      <Preview>Two paths. Pick one. I&apos;ll respect either.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>Hey {firstName},</Text>
          <Text style={text}>
            Your Pro trial ends in a few hours. Here are your options, plainly:
          </Text>

          <Section style={optionBlock}>
            <Text style={optionHeading}>Option 1 — Continue on Pro ($19/mo)</Text>
            <Text style={optionBody}>
              Unlimited questions, full FSRS scheduling, 5 PDFs, Readiness Score, all your progress preserved.
            </Text>
            <Button href={billingUrl} style={buttonPrimary}>
              Add card and continue →
            </Button>
          </Section>

          <Section style={optionBlock}>
            <Text style={optionHeading}>Option 2 — Drop to Free</Text>
            <Text style={optionBody}>
              Do nothing. You&apos;ll roll into the Free plan automatically — 20 questions/day.
              Your progress and uploaded PDFs stay in your account; upgrade later and pick up where you left off.
            </Text>
          </Section>

          <Section style={optionBlock}>
            <Text style={optionHeading}>Option 3 — Save 17% with Annual</Text>
            <Text style={optionBody}>
              Get 12 months for $190 — two months free. Most engineers who choose annual are
              planning the SAP-C02 next.
            </Text>
            <Button href={annualUrl} style={buttonSecondary}>
              Get 12 months for $190 →
            </Button>
          </Section>

          {(readinessScore !== undefined || sessionCount !== undefined) && (
            <Section style={statsBlock}>
              {readinessScore !== undefined && readinessScore > 0 && (
                <Text style={statLine}>📊 Your Readiness Score: <strong style={{ color: "#ffffff" }}>{readinessScore}</strong></Text>
              )}
              {sessionCount !== undefined && sessionCount > 0 && (
                <Text style={statLine}>🧠 Sessions completed: <strong style={{ color: "#ffffff" }}>{sessionCount}</strong></Text>
              )}
            </Section>
          )}

          <Text style={text}>
            That&apos;s the whole pitch. No urgency timer, no &quot;limited spots.&quot;
            If Maestring didn&apos;t earn the $19 in the last 7 days, don&apos;t pay for it.
            If it did, you know where the button is.
          </Text>
          <Text style={text}>
            Whichever you pick — reply to this email and tell me one thing that confused you,
            broke, or could be better. I read every reply and the next 90 days of the roadmap
            is shaped by them.
          </Text>
          <Text style={signature}>
            Alec{"\n"}
            Founder, Maestring
          </Text>
          <Text style={ps}>
            P.S. If you&apos;re delaying because you&apos;re not sure you&apos;ll pass — re-read
            the email I sent on Day 5. If you&apos;re delaying because $19 is a real number this month,
            reply with &quot;tight month&quot; and I&apos;ll give you 30 more days at no cost.
            I&apos;d rather you pass with us than not pass without us.
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

export default TrialDay7Email;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const text = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const optionBlock = { borderLeft: "3px solid #3f3f46", paddingLeft: "16px", marginBottom: "24px" };
const optionHeading = { color: "#ffffff", fontSize: "15px", fontWeight: "700", marginBottom: "6px", marginTop: "0" };
const optionBody = { color: "#a1a1aa", fontSize: "14px", lineHeight: "1.5", marginBottom: "12px", marginTop: "0" };
const buttonPrimary = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const buttonSecondary = { backgroundColor: "#27272a", color: "#e4e4e7", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const statsBlock = { backgroundColor: "#1a1a2e", borderRadius: "8px", padding: "16px", margin: "24px 0" };
const statLine = { color: "#a1a1aa", fontSize: "14px", margin: "4px 0" };
const signature = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px", whiteSpace: "pre-line" as const };
const ps = { color: "#71717a", fontSize: "13px", lineHeight: "1.5", fontStyle: "italic", marginBottom: "24px" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "12px", textAlign: "center" as const };
const footerLink = { color: "#6366f1", textDecoration: "none" };
