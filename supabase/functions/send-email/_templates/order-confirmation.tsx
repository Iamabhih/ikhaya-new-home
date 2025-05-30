
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";

interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: any;
}

export const OrderConfirmationEmail = ({
  customerName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  total,
  shippingAddress,
}: OrderConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order #{orderNumber} has been confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Order Confirmation</Heading>
        <Text style={text}>
          Hi {customerName},
        </Text>
        <Text style={text}>
          Thank you for your order! We've received your order #{orderNumber} placed on {new Date(orderDate).toLocaleDateString()}.
        </Text>
        
        <Section style={orderSection}>
          <Heading style={h2}>Order Details</Heading>
          {items.map((item, index) => (
            <Row key={index} style={itemRow}>
              <Column style={itemName}>{item.name}</Column>
              <Column style={itemQuantity}>Qty: {item.quantity}</Column>
              <Column style={itemPrice}>${item.price.toFixed(2)}</Column>
            </Row>
          ))}
          
          <Row style={totalRow}>
            <Column>Subtotal:</Column>
            <Column style={totalPrice}>${subtotal.toFixed(2)}</Column>
          </Row>
          <Row style={totalRow}>
            <Column>Shipping:</Column>
            <Column style={totalPrice}>${shipping.toFixed(2)}</Column>
          </Row>
          <Row style={totalRowFinal}>
            <Column>Total:</Column>
            <Column style={totalPrice}>${total.toFixed(2)}</Column>
          </Row>
        </Section>

        <Section style={addressSection}>
          <Heading style={h2}>Shipping Address</Heading>
          <Text style={addressText}>
            {shippingAddress.name}<br />
            {shippingAddress.street}<br />
            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
          </Text>
        </Section>

        <Text style={text}>
          We'll send you another email when your order ships. If you have any questions, please contact our support team.
        </Text>

        <Text style={footer}>
          Thank you for shopping with us!
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
  fontSize: "24px",
  fontWeight: "bold",
  paddingTop: "32px",
  paddingBottom: "32px",
};

const h2 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "bold",
  paddingTop: "16px",
  paddingBottom: "8px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const orderSection = {
  backgroundColor: "#f8f9fa",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const itemRow = {
  borderBottom: "1px solid #e9ecef",
  padding: "8px 0",
};

const itemName = {
  fontSize: "14px",
  fontWeight: "500",
};

const itemQuantity = {
  fontSize: "14px",
  color: "#666",
};

const itemPrice = {
  fontSize: "14px",
  fontWeight: "500",
  textAlign: "right" as const,
};

const totalRow = {
  padding: "4px 0",
  fontSize: "14px",
};

const totalRowFinal = {
  padding: "8px 0",
  fontSize: "16px",
  fontWeight: "bold",
  borderTop: "2px solid #333",
};

const totalPrice = {
  textAlign: "right" as const,
  fontWeight: "500",
};

const addressSection = {
  margin: "16px 0",
};

const addressText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#666",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  marginTop: "32px",
  borderTop: "1px solid #e9ecef",
  paddingTop: "16px",
};
