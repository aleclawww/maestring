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

type TrialDay3EmailProps = {
  firstName: string;
  libraryUrl: string;
};

export function TrialDay3Email({ firstName, libraryUrl }: TrialDay3EmailProps) {
  const appUrl = libraryUrl.replace("/library", "").replace("/documents", "");
  return (
    <Html>
      <Head />
      <Preview>This is the feature most users discover too late.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>Hey {firstName},</Text>
          <Text style={text}>
            Most of our users find this feature on Day 5 of the trial and email me saying
            &quot;I wish I&apos;d known on Day 1.&quot; So I&apos;m telling you on Day 3.
          </Text>
          <Text style={{ ...text, fontWeight: "700", color: "#ffffff" }}>Upload one PDF.</Text>
          <Text style={text}>
            Tutorials Dojo cheatsheet, Stephane&apos;s notes, your own VPC summary, AWS whitepaper —
            anything. Maestring chunks it, embeds it (OpenAI text-embedding-3-small, pgvector HNSW
            index), and from then on every generated question can be anchored to the exact section
            of <em>your</em> source material.
          </Text>
          <Text style={text}>
            So when you get a question wrong about S3 lifecycle policies, the explanation cites
            page 47 of the PDF you uploaded — not a generic AWS doc buried 3 clicks deep.
          </Text>
          <Button href={libraryUrl} style={button}>
            Upload a PDF (takes 30 seconds) →
          </Button>
          <Text style={text}>
            Pro plan includes 5 PDFs. You don&apos;t need all 5 — one good one is enough to change
            the experience.
          </Text>
          <Text style={signature}>
            Alec
          </Text>
          <Text style={ps}>
            P.S. The PDFs stay private to your account. We don&apos;t train models on them and
            don&apos;t share them across users. If you upload your employer&apos;s confidential study guide,
            it stays in your account.
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

export default TrialDay3Email;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const text = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "15px", fontWeight: "600", textDecoration: "none", display: "block", textAlign: "center" as const, margin: "24px 0" };
const signature = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const ps = { color: "#71717a", fontSize: "13px", lineHeight: "1.5", fontStyle: "italic", marginBottom: "24px" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "12px", textAlign: "center" as const };
const footerLink = { color: "#6366f1", textDecoration: "none" };
