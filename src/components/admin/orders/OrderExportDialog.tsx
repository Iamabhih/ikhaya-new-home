import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

interface OrderExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderExportDialog = ({ isOpen, onClose }: OrderExportDialogProps) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [includeItems, setIncludeItems] = useState(true);
  const [includeCustomerInfo, setIncludeCustomerInfo] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from('orders')
        .select('*');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }
      if (status !== 'all') {
        query = query.eq('status', status as any);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch order items if needed
      let orderItems: Record<string, any[]> = {};
      if (includeItems && data) {
        const orderIds = data.map(o => o.id);
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        
        items?.forEach(item => {
          if (!orderItems[item.order_id]) orderItems[item.order_id] = [];
          orderItems[item.order_id].push(item);
        });
      }

      // Convert to CSV
      const csvRows: string[] = [];
      
      // Headers
      const headers = [
        'Order Number',
        'Status',
        'Fulfillment Status',
        'Payment Status',
        'Total Amount',
        'Subtotal',
        'Shipping',
        'Discount',
        'Tax',
        'Email',
        'Created At',
        'Shipped At',
        'Delivered At',
        'Tracking Number',
        'Payment Method',
      ];
      
      if (includeItems) {
        headers.push('Items');
      }
      if (includeCustomerInfo) {
        headers.push('Billing Address', 'Shipping Address');
      }
      
      csvRows.push(headers.join(','));

      // Data rows
      data?.forEach((order) => {
        const row = [
          order.order_number,
          order.status,
          order.fulfillment_status,
          order.payment_status,
          order.total_amount,
          order.subtotal,
          order.shipping_amount || 0,
          order.discount_amount || 0,
          order.tax_amount || 0,
          order.email,
          order.created_at,
          order.shipped_at || '',
          order.delivered_at || '',
          order.tracking_number || '',
          order.payment_method || '',
        ];

        if (includeItems) {
          const items = orderItems[order.id]?.map((item: any) => 
            `${item.product_name} (x${item.quantity})`
          ).join('; ');
          row.push(`"${items || ''}"`);
        }

        if (includeCustomerInfo) {
          const billing = typeof order.billing_address === 'string' 
            ? JSON.parse(order.billing_address) 
            : order.billing_address;
          const shipping = order.shipping_address 
            ? (typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address)
            : billing;
          
          row.push(`"${billing?.street || ''}, ${billing?.city || ''}, ${billing?.postal_code || ''}"`);
          row.push(`"${shipping?.street || ''}, ${shipping?.city || ''}, ${shipping?.postal_code || ''}"`);
        }

        csvRows.push(row.map(v => 
          typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        ).join(','));
      });

      // Download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: `Exported ${data?.length || 0} orders to CSV`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Orders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Status Filter</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Include</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeItems"
                  checked={includeItems}
                  onCheckedChange={(checked) => setIncludeItems(!!checked)}
                />
                <label htmlFor="includeItems" className="text-sm">Order Items</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeCustomer"
                  checked={includeCustomerInfo}
                  onCheckedChange={(checked) => setIncludeCustomerInfo(!!checked)}
                />
                <label htmlFor="includeCustomer" className="text-sm">Customer Addresses</label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
