import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GuestOrderLookup } from "@/components/orders/GuestOrderLookup";
import { OrderErrorBoundary } from "@/components/orders/OrderErrorBoundary";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";

const GuestOrderTrackingPage = () => {
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
              <BreadcrumbPage>Order Tracking</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Track Your Order</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your email address or order number to track your order status. 
              No account required - we'll find your orders using the information provided during checkout.
            </p>
          </div>

          <OrderErrorBoundary>
            <GuestOrderLookup />
          </OrderErrorBoundary>

          <div className="mt-12 text-center">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              If you're having trouble finding your order or need assistance, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="text-sm">
                <strong>Email:</strong> support@homeware.co.za
              </div>
              <div className="text-sm">
                <strong>Phone:</strong> +27 11 123 4567
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GuestOrderTrackingPage;