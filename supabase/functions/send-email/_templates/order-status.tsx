
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

interface OrderStatusEmailProps {
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export const OrderStatusEmail = ({
  customerName,
  orderNumber,
  status,
  trackingNumber,
  estimatedDelivery,
}: OrderStatusEmailProps) => {
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Your order is being prepared for shipment.';
      case 'shipped':
        return 'Your order has been shipped and is on its way!';
      case 'delivered':
        return 'Your order has been delivered. We hope you love it!';
      default:
        return `Your order status has been updated to: ${status}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return '#f59e0b';
      case 'shipped':
        return '#3b82f6';
      case 'delivered':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  return (
    <Html>
      <Head />
      <Preview>Order #{orderNumber} status update: {status}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Update</Heading>
          <Text style={text}>
            Hi {customerName},
          </Text>
          
          <Section style={statusSection}>
            <div style={{...statusBadge, backgroundColor: getStatusColor(status)}}>
              {status.toUpperCase()}
            </div>
            <Text style={statusText}>
              {getStatusMessage(status)}
            </Text>
          </Section>

          <Text style={text}>
            <strong>Order Number:</strong> #{orderNumber}
          </Text>

          {trackingNumber && (
            <Section style={trackingSection}>
              <Text style={text}>
                <strong>Tracking Number:</strong> {trackingNumber}
              </Text>
              <Button
                href={`https://example.com/track/${trackingNumber}`}
                style={button}
              >
                Track Your Package
              </Button>
            </Section>
          )}

          {estimatedDelivery && (
            <Text style={text}>
              <strong>Estimated Delivery:</strong> {new Date(estimatedDelivery).toLocaleDateString()}
            </Text>
          )}

          <Text style={text}>
            If you have any questions about your order, please don't hesitate to contact our support team.
          </Text>

          <Text style={footer}>
            Thank you for shopping with us!
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

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  paddingTop: "32px",
  paddingBottom: "32px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const statusSection = {
  backgroundColor: "#f8f9fa",
  padding: "24px",
  borderRadius: "8px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const statusBadge = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: "20px",
  color: "white",
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: "16px",
};

const statusText = {
  fontSize: "18px",
  fontWeight: "500",
  margin: "0",
};

const trackingSection = {
  backgroundColor: "#f0f9ff",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  marginTop: "16px",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  marginTop: "32px",
  borderTop: "1px solid #e9ecef",
  paddingTop: "16px",
};
