import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

type TrialDay5EmailProps = {
  firstName: string;
  dashboardUrl: string;
  readinessScore?: number;
};

export function TrialDay5Email({ firstName, dashboardUrl, readinessScore }: TrialDay5EmailProps) {
  const appUrl = dashboardUrl.replace("/dashboard", "");
  return (
    <Html>
      <Head />
      <Preview>I&apos;m not going to promise you&apos;ll pass. Here&apos;s what I can promise.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>Hey {firstName},</Text>
          <Text style={text}>
            Two days left on your trial. Here&apos;s what I won&apos;t tell you: that Maestring
            guarantees you&apos;ll pass SAA-C03. That&apos;s a legal claim and other prep companies
            that make it are lying to you.
          </Text>
          <Text style={text}>
            Here&apos;s what I can tell you, because the math is real:
          </Text>
          <Text style={text}>
            The Readiness Score on your dashboard is computed from your actual recall on every
            concept tagged to the SAA-C03 objectives, weighted by how recently you saw it and how
            confidently FSRS predicts you&apos;ll still know it on your target exam date.
          </Text>
          <Text style={text}>
            When that number reads 85%+, the engineers who&apos;ve passed before had similar
            trajectories. When it reads 65%, they didn&apos;t pass — and they were grateful Maestring
            told them to delay the booking by 2 weeks instead of burning the $150 exam fee.
          </Text>
          {readinessScore !== undefined && readinessScore > 0 ? (
            <Text style={scoreCallout}>
              Your current Readiness Score: <strong style={{ color: "#ffffff" }}>{readinessScore}</strong>
              {readinessScore >= 80
                ? " — you&apos;re in the pass zone. Keep the streak."
                : readinessScore >= 65
                ? " — on track. 2–3 more sessions should move you materially."
                : " — the algorithm needs more data. A daily session this week will change the number fast."}
            </Text>
          ) : (
            <Text style={text}>
              Open your dashboard now and look at the number. If it&apos;s still warming up because
              you&apos;ve only done one session, that&apos;s the answer too — the algorithm needs you
              to <em>use it</em> to predict for you.
            </Text>
          )}
          <Button href={dashboardUrl} style={button}>
            See my Readiness Score →
          </Button>
          <Text style={signature}>
            Alec
          </Text>
          <Text style={ps}>
            P.S. Pro is $19/mo. The exam is $150. If you&apos;re going to spend $150 to find out,
            spending $19 to know in advance is the cheaper experiment.
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

export default TrialDay5Email;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const text = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const scoreCallout = { ...text, backgroundColor: "#1a1a2e", borderLeft: "3px solid #6366f1", padding: "14px 16px", borderRadius: "6px" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "15px", fontWeight: "600", textDecoration: "none", display: "block", textAlign: "center" as const, margin: "24px 0" };
const signature = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const ps = { color: "#71717a", fontSize: "13px", lineHeight: "1.5", fontStyle: "italic", marginBottom: "24px" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "12px", textAlign: "center" as const };
const footerLink = { color: "#6366f1", textDecoration: "none" };
