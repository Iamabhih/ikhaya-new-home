
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

interface CheckoutButtonProps {
  customerInfo: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export const CheckoutButton = ({ customerInfo }: CheckoutButtonProps) => {
  const { items, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsLoading(true);
    try {
      // Transform cart items for the payment function
      const paymentItems = items.map(item => ({
        productId: item.productId,
        name: item.product?.name || `Product ${item.productId}`,
        description: item.product?.short_description || "",
        price: item.product?.price || 0,
        quantity: item.quantity,
        sku: item.product?.sku || "",
      }));

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: paymentItems,
          customerInfo: customerInfo,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Clear cart before redirecting
        clearCart();
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to process checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading || items.length === 0}
      className="w-full"
      size="lg"
    >
      <ShoppingCart className="h-4 w-4 mr-2" />
      {isLoading ? "Processing..." : "Proceed to Payment"}
    </Button>
  );
};
