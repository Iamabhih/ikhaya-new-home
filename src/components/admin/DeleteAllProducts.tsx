import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DeleteAllProducts = () => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Get total product count
  const { data: productCount = 0 } = useQuery({
    queryKey: ['total-product-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // First delete related data
      await supabase.from('product_images').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cart_items').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('homepage_featured_products').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
      
      // Then delete all products
      const { error } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all products
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-filtered'] });
      queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      queryClient.invalidateQueries({ queryKey: ['total-product-count'] });
      toast.success(`All ${productCount} products deleted successfully`);
      setConfirmationText("");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete products: ${error.message}`);
    },
  });

  const handleDeleteAll = async () => {
    if (confirmationText !== "DELETE ALL PRODUCTS") {
      toast.error("Please type 'DELETE ALL PRODUCTS' to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAllMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationValid = confirmationText === "DELETE ALL PRODUCTS";

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Delete All Products ({productCount} total)</p>
          <p>This will permanently delete all {productCount} products and their related data including:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>All product images</li>
            <li>All cart items containing these products</li>
            <li>All featured product listings</li>
            <li>All product data and variants</li>
          </ul>
          <p className="text-destructive font-medium mt-3">
            This action cannot be undone!
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmation">
            Type "DELETE ALL PRODUCTS" to confirm:
          </Label>
          <Input
            id="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="DELETE ALL PRODUCTS"
            className="font-mono"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={!isConfirmationValid || isDeleting || productCount === 0}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : `Delete All ${productCount} Products`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Final Confirmation
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to permanently delete all {productCount} products and their related data.
                <br /><br />
                <strong>This action cannot be undone!</strong>
                <br /><br />
                Are you absolutely sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, Delete All Products
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};