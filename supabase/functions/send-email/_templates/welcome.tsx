
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

interface WelcomeEmailProps {
  firstName: string;
  email: string;
}

export const WelcomeEmail = ({
  firstName,
  email,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to our store! Start exploring amazing products.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Our Store!</Heading>
        <Text style={text}>
          Hi {firstName},
        </Text>
        <Text style={text}>
          Welcome to our store! We're thrilled to have you as part of our community. 
          You now have access to our entire collection of premium products and exclusive deals.
        </Text>
        
        <Section style={benefitsSection}>
          <Heading style={h2}>What you can expect:</Heading>
          <Text style={benefitText}>✨ Exclusive member discounts</Text>
          <Text style={benefitText}>📦 Free shipping on orders over $50</Text>
          <Text style={benefitText}>🔄 Easy returns within 30 days</Text>
          <Text style={benefitText}>💬 Priority customer support</Text>
        </Section>

        <Section style={ctaSection}>
          <Button
            href="https://yourstore.com/products"
            style={button}
          >
            Start Shopping
          </Button>
        </Section>

        <Text style={text}>
          If you have any questions, our support team is here to help. 
          Just reply to this email or contact us through our website.
        </Text>

        <Text style={footer}>
          Happy shopping!<br />
          The Store Team
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "28px",
  fontWeight: "bold",
  paddingTop: "32px",
  paddingBottom: "32px",
  textAlign: "center" as const,
};

const h2 = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "bold",
  paddingBottom: "16px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const benefitsSection = {
  backgroundColor: "#f8f9fa",
  padding: "24px",
  borderRadius: "8px",
  margin: "24px 0",
};

const benefitText = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "8px 0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "18px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
};

const footer = {
  color: "#898989",
  fontSize: "14px",
  lineHeight: "22px",
  marginTop: "32px",
  borderTop: "1px solid #e9ecef",
  paddingTop: "16px",
  textAlign: "center" as const,
};
