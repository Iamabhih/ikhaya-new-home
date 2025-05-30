
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { PaymentMethods } from "@/components/checkout/PaymentMethods";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";

const CheckoutPage = () => {
  const { items, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [shippingData, setShippingData] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("");

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/cart">Cart</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Checkout</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 1 && (
              <CheckoutForm
                user={user}
                onComplete={(data) => {
                  setShippingData(data);
                  setStep(2);
                }}
              />
            )}
            {step === 2 && (
              <PaymentMethods
                onSelect={(method) => {
                  setPaymentMethod(method);
                  setStep(3);
                }}
                onBack={() => setStep(1)}
              />
            )}
          </div>
          
          <div>
            <OrderSummary items={items} total={total} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
