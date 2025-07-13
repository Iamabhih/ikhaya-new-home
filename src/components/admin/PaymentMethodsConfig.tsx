import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  description: string | null;
  is_active: boolean;
  min_amount: number;
  max_amount: number | null;
  fee_percentage: number;
  fee_fixed: number;
  available_for_wholesale: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PaymentMethodFormData {
  description: string;
  is_active: boolean;
  min_amount: number;
  max_amount: number | null;
  fee_percentage: number;
  fee_fixed: number;
  available_for_wholesale: boolean;
  sort_order: number;
}

export const PaymentMethodsConfig = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMethods, setEditingMethods] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, PaymentMethodFormData>>({});
  const { toast } = useToast();

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .in("type", ["payfast", "payflex"])
        .order("sort_order", { ascending: true });

      if (error) throw error;
      
      setPaymentMethods(data || []);
      
      // Initialize form data
      const initialFormData: Record<string, PaymentMethodFormData> = {};
      data?.forEach(method => {
        initialFormData[method.id] = {
          description: method.description || "",
          is_active: method.is_active,
          min_amount: method.min_amount,
          max_amount: method.max_amount,
          fee_percentage: method.fee_percentage,
          fee_fixed: method.fee_fixed,
          available_for_wholesale: method.available_for_wholesale,
          sort_order: method.sort_order,
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payment methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleEdit = (methodId: string) => {
    setEditingMethods(prev => new Set([...prev, methodId]));
  };

  const handleCancel = (methodId: string) => {
    setEditingMethods(prev => {
      const newSet = new Set(prev);
      newSet.delete(methodId);
      return newSet;
    });
    
    // Reset form data to original values
    const method = paymentMethods.find(m => m.id === methodId);
    if (method) {
      setFormData(prev => ({
        ...prev,
        [methodId]: {
          description: method.description || "",
          is_active: method.is_active,
          min_amount: method.min_amount,
          max_amount: method.max_amount,
          fee_percentage: method.fee_percentage,
          fee_fixed: method.fee_fixed,
          available_for_wholesale: method.available_for_wholesale,
          sort_order: method.sort_order,
        }
      }));
    }
  };

  const handleSave = async (methodId: string) => {
    try {
      const data = formData[methodId];
      const { error } = await supabase
        .from("payment_methods")
        .update({
          description: data.description || null,
          is_active: data.is_active,
          min_amount: data.min_amount,
          max_amount: data.max_amount,
          fee_percentage: data.fee_percentage,
          fee_fixed: data.fee_fixed,
          available_for_wholesale: data.available_for_wholesale,
          sort_order: data.sort_order,
        })
        .eq("id", methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method updated successfully",
      });

      setEditingMethods(prev => {
        const newSet = new Set(prev);
        newSet.delete(methodId);
        return newSet;
      });

      fetchPaymentMethods();
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast({
        title: "Error",
        description: "Failed to update payment method",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (methodId: string, field: keyof PaymentMethodFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        [field]: value
      }
    }));
  };

  if (loading) {
    return <div className="text-center py-4">Loading payment methods...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Payment Methods Configuration</h2>
      </div>

      <div className="grid gap-6">
        {paymentMethods.map((method) => {
          const isEditing = editingMethods.has(method.id);
          const data = formData[method.id] || {
            description: method.description || "",
            is_active: method.is_active,
            min_amount: method.min_amount,
            max_amount: method.max_amount,
            fee_percentage: method.fee_percentage,
            fee_fixed: method.fee_fixed,
            available_for_wholesale: method.available_for_wholesale,
            sort_order: method.sort_order,
          };

          return (
            <Card key={method.id}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {method.name}
                      <Badge variant={data.is_active ? "default" : "secondary"}>
                        {data.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {method.type === "payfast" && (
                        <Badge variant="outline">South African</Badge>
                      )}
                      {method.type === "payflex" && (
                        <Badge variant="outline">Buy Now Pay Later</Badge>
                      )}
                    </CardTitle>
                  </div>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(method.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(method.id)}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(method.id)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`description-${method.id}`}>Description</Label>
                      <Textarea
                        id={`description-${method.id}`}
                        value={data.description || ""}
                        onChange={(e) => updateFormData(method.id, "description", e.target.value)}
                        placeholder="Payment method description"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`min-amount-${method.id}`}>Min Amount (R)</Label>
                        <Input
                          id={`min-amount-${method.id}`}
                          type="number"
                          step="0.01"
                          value={data.min_amount || 0}
                          onChange={(e) => updateFormData(method.id, "min_amount", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`max-amount-${method.id}`}>Max Amount (R)</Label>
                        <Input
                          id={`max-amount-${method.id}`}
                          type="number"
                          step="0.01"
                          value={data.max_amount || ""}
                          onChange={(e) => updateFormData(method.id, "max_amount", e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="No limit"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sort-order-${method.id}`}>Sort Order</Label>
                        <Input
                          id={`sort-order-${method.id}`}
                          type="number"
                          value={data.sort_order || 0}
                          onChange={(e) => updateFormData(method.id, "sort_order", parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`fee-percentage-${method.id}`}>Fee Percentage (%)</Label>
                        <Input
                          id={`fee-percentage-${method.id}`}
                          type="number"
                          step="0.01"
                          value={data.fee_percentage || 0}
                          onChange={(e) => updateFormData(method.id, "fee_percentage", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`fee-fixed-${method.id}`}>Fixed Fee (R)</Label>
                        <Input
                          id={`fee-fixed-${method.id}`}
                          type="number"
                          step="0.01"
                          value={data.fee_fixed || 0}
                          onChange={(e) => updateFormData(method.id, "fee_fixed", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`active-${method.id}`}
                          checked={data.is_active}
                          onCheckedChange={(checked) => updateFormData(method.id, "is_active", checked)}
                        />
                        <Label htmlFor={`active-${method.id}`}>Active</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`wholesale-${method.id}`}
                          checked={data.available_for_wholesale}
                          onCheckedChange={(checked) => updateFormData(method.id, "available_for_wholesale", checked)}
                        />
                        <Label htmlFor={`wholesale-${method.id}`}>Available for Wholesale</Label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.description && (
                      <p className="text-sm text-muted-foreground">{data.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Amount Range:</span>
                        <p className="text-muted-foreground">
                          R{data.min_amount?.toFixed(2) || "0.00"} - {data.max_amount ? `R${data.max_amount.toFixed(2)}` : "No limit"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Fee Structure:</span>
                        <p className="text-muted-foreground">
                          {data.fee_percentage > 0 && `${data.fee_percentage}%`}
                          {data.fee_percentage > 0 && data.fee_fixed > 0 && " + "}
                          {data.fee_fixed > 0 && `R${data.fee_fixed.toFixed(2)}`}
                          {data.fee_percentage === 0 && data.fee_fixed === 0 && "Free"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Wholesale:</span>
                        <p className="text-muted-foreground">
                          {data.available_for_wholesale ? "Available" : "Not available"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Sort Order:</span>
                        <p className="text-muted-foreground">{data.sort_order}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {paymentMethods.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No PayFast or PayFlex payment methods found. Please check your payment method configuration.
        </div>
      )}
    </div>
  );
};