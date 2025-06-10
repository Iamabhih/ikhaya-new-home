
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { toast } from "sonner";

const AdminPayments = () => {
  const queryClient = useQueryClient();
  
  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      toast.success('Payment method updated successfully');
    },
    onError: () => {
      toast.error('Failed to update payment method');
    },
  });

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updatePaymentMethodMutation.mutate({
      id,
      updates: { is_active: !currentActive }
    });
  };

  if (isLoading) {
    return (
      <AdminProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="text-center py-8">Loading payment methods...</div>
          </main>
          <Footer />
        </div>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute requireSuperAdmin>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Payment Settings</h1>

          <div className="space-y-6">
            {paymentMethods.map((method) => (
              <Card key={method.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {method.name}
                        <Badge variant={method.is_active ? "default" : "secondary"}>
                          {method.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                    <Switch
                      checked={method.is_active}
                      onCheckedChange={() => handleToggleActive(method.id, method.is_active)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Minimum Amount (R)</Label>
                      <Input
                        type="number"
                        value={method.min_amount || 0}
                        onChange={(e) => {
                          updatePaymentMethodMutation.mutate({
                            id: method.id,
                            updates: { min_amount: parseFloat(e.target.value) || 0 }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Maximum Amount (R)</Label>
                      <Input
                        type="number"
                        value={method.max_amount || ''}
                        placeholder="No limit"
                        onChange={(e) => {
                          updatePaymentMethodMutation.mutate({
                            id: method.id,
                            updates: { max_amount: e.target.value ? parseFloat(e.target.value) : null }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={method.sort_order || 0}
                        onChange={(e) => {
                          updatePaymentMethodMutation.mutate({
                            id: method.id,
                            updates: { sort_order: parseInt(e.target.value) || 0 }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Fee Percentage (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={method.fee_percentage || 0}
                        onChange={(e) => {
                          updatePaymentMethodMutation.mutate({
                            id: method.id,
                            updates: { fee_percentage: parseFloat(e.target.value) || 0 }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Fixed Fee (R)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={method.fee_fixed || 0}
                        onChange={(e) => {
                          updatePaymentMethodMutation.mutate({
                            id: method.id,
                            updates: { fee_fixed: parseFloat(e.target.value) || 0 }
                          });
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminPayments;
