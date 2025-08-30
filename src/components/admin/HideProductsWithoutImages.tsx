import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EyeOff, AlertTriangle, Package, Loader2 } from "lucide-react";

export const HideProductsWithoutImages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    totalProducts: number;
    productsWithoutImages: number;
    hiddenProducts: number;
  } | null>(null);

  const handleHideProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hide-products-without-images');
      
      if (error) {
        console.error('Error hiding products:', error);
        toast.error('Failed to hide products without images');
        return;
      }

      setLastResult(data);
      toast.success(`Successfully hid ${data.hiddenProducts} products without images`);
    } catch (error) {
      console.error('Error hiding products:', error);
      toast.error('Failed to hide products without images');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-orange-600" />
          Hide Products Without Images
        </CardTitle>
        <CardDescription>
          Automatically hide (deactivate) all products that don't have any associated images.
          This helps maintain a clean product catalog by removing products without visual representation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Last Operation Results:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-700">{lastResult.totalProducts}</div>
                <p className="text-blue-600">Total Products</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-700">{lastResult.productsWithoutImages}</div>
                <p className="text-orange-600">Without Images</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">{lastResult.hiddenProducts}</div>
                <p className="text-green-600">Hidden</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800">Important Notes:</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• This action will set <code className="bg-yellow-100 px-1 rounded">is_active = false</code> for products without images</li>
                <li>• Hidden products won't appear in the public catalog or search results</li>
                <li>• You can manually reactivate products later if needed</li>
                <li>• This operation cannot be undone automatically</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Hide Products Without Images
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Hide Products Without Images
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action will hide (deactivate) all products that don't have any associated images.
                  Hidden products will not appear in the public catalog.
                  <br /><br />
                  Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleHideProducts}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Hide Products
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Badge variant="outline" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            SuperAdmin Only
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};