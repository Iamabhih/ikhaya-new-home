import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, User, Star, Crown, ShieldCheck } from "lucide-react";

interface OrderRiskBadgeProps {
  order: {
    id: string;
    email: string;
    total_amount: number;
    user_id?: string | null;
  };
}

interface CustomerHistory {
  totalOrders: number;
  totalSpent: number;
  isFirstOrder: boolean;
  isHighValue: boolean;
  riskScore: 'low' | 'medium' | 'high';
}

export const OrderRiskBadge = ({ order }: OrderRiskBadgeProps) => {
  const { data: history } = useQuery({
    queryKey: ['customer-history', order.email],
    queryFn: async (): Promise<CustomerHistory> => {
      // Get customer order history
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status')
        .eq('email', order.email)
        .neq('id', order.id);

      if (error) throw error;

      const completedOrders = orders?.filter(o => 
        ['completed', 'delivered', 'shipped', 'processing'].includes(o.status)
      ) || [];
      
      const totalOrders = completedOrders.length;
      const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const isFirstOrder = totalOrders === 0;
      const isHighValue = order.total_amount > 5000;

      // Simple risk assessment
      let riskScore: 'low' | 'medium' | 'high' = 'low';
      if (isFirstOrder && isHighValue) {
        riskScore = 'medium';
      }
      if (isFirstOrder && order.total_amount > 10000) {
        riskScore = 'high';
      }
      if (totalOrders >= 3) {
        riskScore = 'low'; // Repeat customer = low risk
      }

      return {
        totalOrders,
        totalSpent,
        isFirstOrder,
        isHighValue,
        riskScore,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!history) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Customer Status Badge */}
        {history.isFirstOrder ? (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <User className="h-3 w-3 mr-1" />
                New
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>First-time customer</p>
            </TooltipContent>
          </Tooltip>
        ) : history.totalOrders >= 5 ? (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Crown className="h-3 w-3 mr-1" />
                VIP
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{history.totalOrders} orders • R{history.totalSpent.toFixed(0)} spent</p>
            </TooltipContent>
          </Tooltip>
        ) : history.totalOrders >= 2 ? (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Star className="h-3 w-3 mr-1" />
                Repeat
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{history.totalOrders} previous orders</p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {/* High Value Badge */}
        {history.isHighValue && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                High Value
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Order over R5,000</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Risk Indicator */}
        {history.riskScore === 'high' && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Review
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>High-value first order - recommend verification</p>
            </TooltipContent>
          </Tooltip>
        )}

        {history.riskScore === 'low' && history.totalOrders >= 3 && (
          <Tooltip>
            <TooltipTrigger>
              <ShieldCheck className="h-4 w-4 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Trusted customer</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
