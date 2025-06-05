
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Package, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface PaymentSuccessProps {
  paymentResult: any;
}

export const PaymentSuccess = ({ paymentResult }: PaymentSuccessProps) => {
  const copyBankingDetails = () => {
    const details = `
Bank: ${paymentResult.bankingDetails?.bankName}
Account: ${paymentResult.bankingDetails?.accountNumber}
Branch Code: ${paymentResult.bankingDetails?.branchCode}
Reference: ${paymentResult.bankingDetails?.reference}
Amount: R${paymentResult.amount}
    `.trim();
    
    navigator.clipboard.writeText(details);
    toast.success("Banking details copied to clipboard");
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl text-green-600">
          Order Created Successfully!
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Order Number:</strong> {paymentResult.orderNumber}
          </p>
          <p className="text-sm">
            <strong>Total Amount:</strong> R{paymentResult.amount}
          </p>
        </div>

        {paymentResult.type === 'bank_transfer' && paymentResult.bankingDetails && (
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-blue-900">Banking Details</h3>
            <div className="text-left space-y-1 text-sm">
              <p><strong>Bank:</strong> {paymentResult.bankingDetails.bankName}</p>
              <p><strong>Account Number:</strong> {paymentResult.bankingDetails.accountNumber}</p>
              <p><strong>Branch Code:</strong> {paymentResult.bankingDetails.branchCode}</p>
              <p><strong>Account Type:</strong> {paymentResult.bankingDetails.accountType}</p>
              <p><strong>Reference:</strong> {paymentResult.bankingDetails.reference}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyBankingDetails}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Banking Details
            </Button>
            <p className="text-xs text-blue-700">
              {paymentResult.instructions}
            </p>
          </div>
        )}

        {paymentResult.message && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">{paymentResult.message}</p>
          </div>
        )}

        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link to="/orders">
              <Package className="h-4 w-4 mr-2" />
              View Your Orders
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
