import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type SubscriptionConfirmedEmailProps = {
  firstName: string;
  planName: string;
  amount: string;
  nextBillingDate: string;
  studyUrl: string;
};

export function SubscriptionConfirmedEmail({
  firstName,
  planName,
  amount,
  nextBillingDate,
  studyUrl,
}: SubscriptionConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {planName} subscription is active — let's get certified!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={heroIcon}>🎉</Text>
          </Section>
          <Heading style={h1}>You're all set, {firstName}!</Heading>
          <Text style={text}>
            Your <strong>{planName}</strong> subscription is now active. All premium features are unlocked.
          </Text>
          <Section style={invoiceBox}>
            <Row>
              <Column style={invoiceLabel}>Plan</Column>
              <Column style={invoiceValue}>{planName}</Column>
            </Row>
            <Row>
              <Column style={invoiceLabel}>Amount</Column>
              <Column style={invoiceValue}>{amount}/month</Column>
            </Row>
            <Row>
              <Column style={invoiceLabel}>Next billing</Column>
              <Column style={invoiceValue}>{nextBillingDate}</Column>
            </Row>
          </Section>
          <Text style={text}>What's unlocked with your subscription:</Text>
          <Text style={listItem}>🤖 Unlimited AI-generated questions</Text>
          <Text style={listItem}>📄 PDF upload & processing</Text>
          <Text style={listItem}>📊 Advanced analytics & domain breakdown</Text>
          <Text style={listItem}>🎯 Full exam simulator (65 questions)</Text>
          <Section style={btnSection}>
            <Button href={studyUrl} style={button}>
              Start Studying →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Maestring · You can manage your subscription at any time from Settings → Billing
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SubscriptionConfirmedEmail;

const main = { backgroundColor: "#0f1117", fontFamily: "Inter, -apple-system, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" };
const hero = { textAlign: "center" as const, marginBottom: "24px" };
const heroIcon = { fontSize: "48px", margin: 0 };
const h1 = { color: "#ffffff", fontSize: "26px", fontWeight: "700", marginBottom: "16px", textAlign: "center" as const };
const text = { color: "#a1a1aa", fontSize: "16px", lineHeight: "24px", marginBottom: "12px" };
const listItem = { color: "#a1a1aa", fontSize: "15px", lineHeight: "24px", paddingLeft: "4px" };
const invoiceBox = { backgroundColor: "#1e1e2e", borderRadius: "8px", padding: "20px", margin: "24px 0" };
const invoiceLabel = { color: "#71717a", fontSize: "14px", paddingBottom: "8px" };
const invoiceValue = { color: "#ffffff", fontSize: "14px", fontWeight: "600", textAlign: "right" as const, paddingBottom: "8px" };
const btnSection = { textAlign: "center" as const, margin: "32px 0" };
const button = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600", textDecoration: "none", display: "inline-block" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
const footer = { color: "#52525b", fontSize: "13px", textAlign: "center" as const };
