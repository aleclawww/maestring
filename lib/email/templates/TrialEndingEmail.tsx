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
} from '@react-email/components'
import * as React from 'react'

type TrialEndingEmailProps = {
  firstName: string
  daysRemaining: number
  trialEndDate: string
  upgradeUrl: string
  studyUrl: string
}

export function TrialEndingEmail({
  firstName,
  daysRemaining,
  trialEndDate,
  upgradeUrl,
  studyUrl,
}: TrialEndingEmailProps) {
  const isLastDay = daysRemaining <= 1
  const previewText = isLastDay
    ? `Your trial ends today, ${firstName} — keep your progress`
    : `Your trial ends in ${daysRemaining} days — don't lose your progress`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={iconSection}>
            <Text style={iconText}>{isLastDay ? '⏰' : '⏳'}</Text>
          </Section>
          <Heading style={h1}>
            {isLastDay
              ? `Your trial ends today, ${firstName}`
              : `${daysRemaining} days left in your trial`}
          </Heading>
          <Text style={text}>
            Your Maestring Pro trial expires on <strong style={{ color: '#ffffff' }}>{trialEndDate}</strong>.
            After that, you'll lose access to:
          </Text>
          <Text style={listItem}>🤖 Unlimited AI-generated questions</Text>
          <Text style={listItem}>📄 PDF upload &amp; processing</Text>
          <Text style={listItem}>📊 Advanced analytics &amp; domain breakdown</Text>
          <Text style={listItem}>🎯 Full exam simulator (65 questions)</Text>
          <Text style={text}>
            Your spaced repetition progress and all study history will remain — you won&apos;t
            lose a thing. But new questions and premium features will be paused until you upgrade.
          </Text>
          <Section style={btnSection}>
            <Button href={upgradeUrl} style={buttonPrimary}>
              Upgrade to Pro →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={subText}>
            Not ready yet?{' '}
            <a href={studyUrl} style={link}>
              Keep studying for free
            </a>{' '}
            — your flashcard deck is always yours.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Maestring · Questions?{' '}
            <a href='mailto:support@maestring.com' style={link}>
              support@maestring.com
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TrialEndingEmail

const main = { backgroundColor: '#0f1117', fontFamily: 'Inter, -apple-system, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const iconSection = { textAlign: 'center' as const, marginBottom: '24px' }
const iconText = { fontSize: '48px', margin: 0 }
const h1 = {
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '700',
  marginBottom: '16px',
  textAlign: 'center' as const,
}
const text = { color: '#a1a1aa', fontSize: '16px', lineHeight: '24px', marginBottom: '12px' }
const listItem = { color: '#a1a1aa', fontSize: '15px', lineHeight: '24px', paddingLeft: '4px' }
const subText = { color: '#71717a', fontSize: '14px', lineHeight: '22px', textAlign: 'center' as const }
const btnSection = { textAlign: 'center' as const, margin: '32px 0' }
const buttonPrimary = {
  backgroundColor: '#6366f1',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '14px 28px',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#27272a', margin: '24px 0' }
const footer = { color: '#52525b', fontSize: '13px', textAlign: 'center' as const }
const link = { color: '#6366f1', textDecoration: 'none' }
