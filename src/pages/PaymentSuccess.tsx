
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        setOrderDetails(data);
        toast.success("Payment verified successfully!");
      } catch (error) {
        console.error("Payment verification error:", error);
        toast.error("Unable to verify payment status");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                {isVerifying ? (
                  <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <CardTitle className="text-2xl text-green-600">
                {isVerifying ? "Verifying Payment..." : "Payment Successful!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {!isVerifying && (
                <>
                  <p className="text-muted-foreground">
                    Thank you for your purchase. Your order has been confirmed and will be processed shortly.
                  </p>
                  
                  {orderDetails && (
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm">
                        <strong>Order Number:</strong> {orderDetails.orderNumber}
                      </p>
                      <p className="text-sm">
                        <strong>Status:</strong> {orderDetails.status}
                      </p>
                    </div>
                  )}

                  {sessionId && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">
                        <strong>Session ID:</strong> {sessionId}
                      </p>
                    </div>
                  )}
                </>
              )}

              {!isVerifying && (
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
