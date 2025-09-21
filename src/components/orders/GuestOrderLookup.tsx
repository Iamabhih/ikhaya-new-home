import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderCard } from "./OrderCard";
import { Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const GuestOrderLookup = () => {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [searchInitiated, setSearchInitiated] = useState(false);
  const { toast } = useToast();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['guest-orders', email, orderNumber],
    queryFn: async () => {
      if (!email && !orderNumber) return [];
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_name,
            quantity,
            total_price
          )
        `);

      // Search by email and/or order number
      if (email && orderNumber) {
        query = query.eq('email', email).eq('order_number', orderNumber);
      } else if (email) {
        query = query.eq('email', email);
      } else if (orderNumber) {
        query = query.eq('order_number', orderNumber);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchInitiated && (!!email || !!orderNumber),
  });

  const handleSearch = () => {
    if (!email && !orderNumber) {
      toast({
        title: "Search Required",
        description: "Please enter either an email address or order number to search.",
        variant: "destructive",
      });
      return;
    }

    setSearchInitiated(true);
  };

  const handleReset = () => {
    setEmail("");
    setOrderNumber("");
    setSearchInitiated(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Guest Order Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                placeholder="e.g., ORD-123456"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Searching..." : "Search Orders"}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Enter your email address or order number to find your orders. 
            You can also enter both for more specific results.
          </p>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchInitiated && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search Error</h3>
                <p className="text-muted-foreground">
                  There was an error searching for orders. Please try again.
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                  No orders were found matching your search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {orders.length} order{orders.length !== 1 ? 's' : ''}
                </p>
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};