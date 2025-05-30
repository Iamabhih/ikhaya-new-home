
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { RotateCcw, ArrowLeft } from "lucide-react";

const ReturnRequestPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-for-return', orderId],
    queryFn: async () => {
      if (!orderId || !user?.email) return null;
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', orderId)
        .eq('email', user.email)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user?.email,
  });

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const handleSubmit = async () => {
    if (!returnReason) {
      toast.error("Please select a return reason");
      return;
    }

    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate total refund amount
      const selectedOrderItems = order?.order_items?.filter(item => 
        selectedItemIds.includes(item.id)
      ) || [];
      
      const totalRefund = selectedOrderItems.reduce((sum, item) => sum + item.total_price, 0);

      // Create return request
      const { data: returnRequest, error: returnError } = await supabase
        .from('return_requests')
        .insert({
          order_id: orderId,
          user_id: user?.id,
          email: user?.email || '',
          return_reason: returnReason,
          return_description: returnDescription,
          refund_amount: totalRefund,
          requested_items: selectedOrderItems.map(item => ({
            id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItems = selectedOrderItems.map(item => ({
        return_request_id: returnRequest.id,
        order_item_id: item.id,
        quantity: item.quantity,
        refund_amount: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('return_items')
        .insert(returnItems);

      if (itemsError) throw itemsError;

      toast.success("Return request submitted successfully!");
      navigate("/returns");
    } catch (error) {
      console.error("Error submitting return request:", error);
      toast.error("Failed to submit return request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The order you're trying to return could not be found.
              </p>
              <Button onClick={() => navigate("/orders")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
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
              <BreadcrumbLink href="/returns">Returns</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Return Request</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Return Request</h1>
            <p className="text-muted-foreground">
              Order #{order.order_number} • Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Select Items to Return
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 p-3 border rounded">
                  <Checkbox
                    id={item.id}
                    checked={selectedItems[item.id] || false}
                    onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <label htmlFor={item.id} className="cursor-pointer">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} • R{item.unit_price} each
                      </div>
                    </label>
                  </div>
                  <div className="font-medium">R{item.total_price}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Return Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="return-reason">Reason for Return *</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">Defective/Damaged</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                    <SelectItem value="not_as_described">Not as Described</SelectItem>
                    <SelectItem value="changed_mind">Changed Mind</SelectItem>
                    <SelectItem value="size_issue">Size/Fit Issue</SelectItem>
                    <SelectItem value="quality_issue">Quality Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="return-description">Additional Details (Optional)</Label>
                <Textarea
                  id="return-description"
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Please provide additional details about your return..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/orders")}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Return Request"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReturnRequestPage;
