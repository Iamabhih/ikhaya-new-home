
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Package } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      // Here you could fetch order details based on session ID
      console.log("Payment session ID:", sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Thank you for your purchase. Your order has been confirmed and will be processed shortly.
              </p>
              
              {sessionId && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Session ID:</strong> {sessionId}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to="/orders">
                    <Package className="h-4 w-4 mr-2" />
                    View Your Orders
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/">
                    <Home className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
