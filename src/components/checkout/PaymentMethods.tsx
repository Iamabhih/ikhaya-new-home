
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Banknote, Truck, ArrowLeft, Building, Clock } from "lucide-react";

interface PaymentMethodsProps {
  onSelect: (method: string) => void;
  onBack: () => void;
}

export const PaymentMethods = ({ onSelect, onBack }: PaymentMethodsProps) => {
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'payfast':
        return <CreditCard className="h-6 w-6" />;
      case 'payflex':
        return <Clock className="h-6 w-6" />;
      case 'instant_eft':
        return <Banknote className="h-6 w-6" />;
      case 'bank_transfer':
      case 'eft':
        return <Building className="h-6 w-6" />;
      case 'cod':
        return <Truck className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Payment Method</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <Button
              key={method.id}
              variant="outline"
              className="w-full justify-start p-4 h-auto"
              onClick={() => onSelect(method.type)}
            >
              <div className="flex items-center gap-3">
                {getIcon(method.type)}
                <div className="text-left">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-muted-foreground">{method.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
