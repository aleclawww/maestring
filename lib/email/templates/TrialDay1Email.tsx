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

type TrialDay1EmailProps = {
  firstName: string;
  dashboardUrl: string;
};

export function TrialDay1Email({ firstName, dashboardUrl }: TrialDay1EmailProps) {
  const appUrl = dashboardUrl.replace("/dashboard", "");
  return (
    <Html>
      <Head />
      <Preview>Why a course that 250,000 people loved still won't get you certified.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>Hey {firstName},</Text>
          <Text style={text}>Quick story.</Text>
          <Text style={text}>
            Stephane Maarek&apos;s SAA course is genuinely one of the best video courses on Udemy.
            It has 250,000+ ratings. The reason it doesn&apos;t get most engineers certified
            isn&apos;t Stephane — it&apos;s that watching a 27-hour course and then taking practice tests
            doesn&apos;t put information into long-term memory. It puts it into short-term memory until
            the test, then it leaks.
          </Text>
          <Text style={text}>This is a solved problem. The fix is called spaced repetition.</Text>
          <Text style={text}>
            Anki nailed it for med students. The reason nobody uses Anki for AWS is that building
            a deck of 800 cards by hand for SAA-C03 is a weekend you don&apos;t have, and the community
            decks rot the day AWS updates the exam objectives.
          </Text>
          <Text style={text}>
            Maestring is what you get when you put FSRS-4.5 (the algorithm Anki should be using)
            behind questions generated for <em>your</em> specific weak spots — not pulled from a static deck.
          </Text>
          <Text style={text}>
            If you ran a session yesterday, log in today and look at your Due Concepts:
          </Text>
          <Button href={dashboardUrl} style={button}>
            See what&apos;s due today →
          </Button>
          <Text style={text}>
            That&apos;s the algorithm working. The concepts you got wrong yesterday will resurface today.
            The ones you nailed won&apos;t show up again until they&apos;re about to fall out of your head.
          </Text>
          <Text style={signature}>
            Alec
          </Text>
          <Text style={ps}>
            P.S. If you didn&apos;t run a session yesterday, the algorithm has nothing to schedule.
            Run one now and I&apos;ll see you tomorrow.
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

export default TrialDay1Email;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const text = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "15px", fontWeight: "600", textDecoration: "none", display: "block", textAlign: "center" as const, margin: "24px 0" };
const signature = { color: "#a1a1aa", fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" };
const ps = { color: "#71717a", fontSize: "13px", lineHeight: "1.5", fontStyle: "italic", marginBottom: "24px" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "12px", textAlign: "center" as const };
const footerLink = { color: "#6366f1", textDecoration: "none" };
