import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface PackingSlipDialogProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export const PackingSlipDialog = ({ order, isOpen, onClose }: PackingSlipDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Packing Slip - ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; }
            .order-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .checkbox { width: 20px; height: 20px; border: 1px solid #333; display: inline-block; margin-right: 10px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const billingAddress = typeof order.billing_address === 'string' 
    ? JSON.parse(order.billing_address) 
    : order.billing_address;
  const shippingAddress = order.shipping_address 
    ? (typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address)
    : billingAddress;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Packing Slip - #{order.order_number}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4">
          {/* Header */}
          <div className="header text-center mb-8 border-b-2 border-foreground pb-4">
            <div className="logo text-2xl font-bold">OZZ Store</div>
            <p className="text-muted-foreground">Packing Slip</p>
          </div>

          {/* Order Info */}
          <div className="flex justify-between mb-8">
            <div>
              <h3 className="font-semibold mb-2">Order Information</h3>
              <p>Order #: {order.order_number}</p>
              <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
              <p>Status: {order.status}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-2">Ship To</h3>
              <p>{shippingAddress?.name || shippingAddress?.first_name}</p>
              <p>{shippingAddress?.street || shippingAddress?.address}</p>
              <p>{shippingAddress?.city}, {shippingAddress?.postal_code}</p>
              <p>{shippingAddress?.province || shippingAddress?.state}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4 border-b pb-2">Items to Pack</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 w-12">✓</th>
                  <th className="border p-2 text-left">Product</th>
                  <th className="border p-2 text-left">SKU</th>
                  <th className="border p-2 text-center">Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="border p-2 text-center">
                      <span className="inline-block w-4 h-4 border border-foreground"></span>
                    </td>
                    <td className="border p-2">{item.product_name}</td>
                    <td className="border p-2 text-muted-foreground">{item.product_sku || '-'}</td>
                    <td className="border p-2 text-center font-medium">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {order.customer_notes && (
            <div className="mb-8 p-4 bg-muted rounded">
              <h3 className="font-semibold mb-2">Customer Notes</h3>
              <p className="text-sm">{order.customer_notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="footer text-center text-sm text-muted-foreground mt-8 pt-4 border-t">
            <p>Thank you for your order!</p>
            <p>Questions? Contact us at support@ozzstore.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
