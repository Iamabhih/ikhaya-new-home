
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";

interface AdminNotificationEmailProps {
  type: 'new-order' | 'low-stock' | 'return-request' | 'contact-form';
  subject: string;
  message: string;
  data?: any;
  actionUrl?: string;
  actionText?: string;
}

export const AdminNotificationEmail = ({
  type,
  subject,
  message,
  data,
  actionUrl,
  actionText,
}: AdminNotificationEmailProps) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'new-order':
        return '#10b981';
      case 'low-stock':
        return '#f59e0b';
      case 'return-request':
        return '#ef4444';
      case 'contact-form':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new-order':
        return '🛒';
      case 'low-stock':
        return '⚠️';
      case 'return-request':
        return '↩️';
      case 'contact-form':
        return '📧';
      default:
        return '🔔';
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <div style={{...typeBadge, backgroundColor: getTypeColor(type)}}>
              {getTypeIcon(type)} {type.replace('-', ' ').toUpperCase()}
            </div>
            <Heading style={h1}>{subject}</Heading>
          </Section>
          
          <Text style={text}>
            {message}
          </Text>

          {data && (
            <Section style={dataSection}>
              <Heading style={h2}>Details:</Heading>
              <pre style={dataText}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </Section>
          )}

          {actionUrl && actionText && (
            <Section style={ctaSection}>
              <Button href={actionUrl} style={button}>
                {actionText}
              </Button>
            </Section>
          )}

          <Text style={footer}>
            This is an automated notification from your store admin system.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
};

const headerSection = {
  textAlign: "center" as const,
  paddingBottom: "24px",
};

const typeBadge = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: "20px",
  color: "white",
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: "16px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const h2 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "bold",
  paddingBottom: "8px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const dataSection = {
  backgroundColor: "#f8f9fa",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const dataText = {
  fontSize: "12px",
  color: "#666",
  fontFamily: "monospace",
  whiteSpace: "pre-wrap" as const,
  overflow: "auto",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  marginTop: "32px",
  borderTop: "1px solid #e9ecef",
  paddingTop: "16px",
  textAlign: "center" as const,
};
