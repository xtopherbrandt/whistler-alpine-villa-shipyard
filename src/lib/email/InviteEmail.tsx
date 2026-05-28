import {
  Html,
  Body,
  Heading,
  Text,
  Button,
  Section,
} from '@react-email/components'

interface InviteEmailProps {
  recipientName: string
  activationUrl: string
}

export function InviteEmail({ recipientName, activationUrl }: InviteEmailProps) {
  return (
    <Html lang="en">
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 0' }}>
        <Section style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '8px' }}>
          <Heading as="h1" style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
            You&apos;ve been invited to Whistler Alpine Villa
          </Heading>
          <Text style={{ fontSize: '16px', color: '#333', marginBottom: '24px' }}>
            Hi {recipientName},
          </Text>
          <Text style={{ fontSize: '16px', color: '#333', marginBottom: '24px' }}>
            An administrator has set up an account for you on the Whistler Alpine Villa
            management portal. Click the button below to activate your account and set
            your password.
          </Text>
          <Button
            href={activationUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: 'bold',
              textDecoration: 'none',
              marginBottom: '24px',
            }}
          >
            Activate your account
          </Button>
          <Text style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            This invitation link expires in 72 hours.
          </Text>
          <Text style={{ fontSize: '14px', color: '#666' }}>
            If the button above doesn&apos;t work, copy and paste this link into your browser:
            <br />
            <a href={activationUrl} style={{ color: '#000', wordBreak: 'break-all' }}>
              {activationUrl}
            </a>
          </Text>
        </Section>
      </Body>
    </Html>
  )
}
