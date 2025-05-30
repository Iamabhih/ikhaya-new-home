
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Eye, Truck, CheckCircle, Clock, XCircle, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    created_at: string;
    order_items?: Array<{
      id: string;
      product_name: string;
      quantity: number;
      total_price: number;
    }>;
  };
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'processing': return 'default';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Check if order can be returned (delivered orders within 30 days)
  const canRequestReturn = () => {
    if (order.status !== 'delivered') return false;
    const deliveryDate = new Date(order.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return deliveryDate > thirtyDaysAgo;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={getStatusColor(order.status)} className="flex items-center gap-1">
            {getStatusIcon(order.status)}
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.product_name} x {item.quantity}</span>
              <span>R{item.total_price}</span>
            </div>
          ))}
          
          <div className="border-t pt-2 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>R{order.total_amount}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              {canRequestReturn() && (
                <Link to={`/return-request/${order.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Request Return
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
