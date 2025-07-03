import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, 
  Edit, 
  Archive, 
  Eye, 
  EyeOff, 
  Tag, 
  Copy,
  Download,
  Trash2
} from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductBulkActionsProps {
  selectedProducts: string[];
  onClearSelection: () => void;
}

export const ProductBulkActions = ({ selectedProducts, onClearSelection }: ProductBulkActionsProps) => {
  const [bulkAction, setBulkAction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action, products }: { action: string; products: string[] }) => {
      let updateData: any = {};
      
      switch (action) {
        case 'activate':
          updateData = { is_active: true };
          break;
        case 'deactivate':
          updateData = { is_active: false };
          break;
        case 'feature':
          updateData = { is_featured: true };
          break;
        case 'unfeature':
          updateData = { is_featured: false };
          break;
        case 'delete':
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .in('id', products);
          if (deleteError) throw deleteError;
          return;
        default:
          throw new Error('Invalid bulk action');
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .in('id', products);
      
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-filtered'] });
      queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      
      const actionLabels = {
        activate: 'activated',
        deactivate: 'deactivated',
        feature: 'featured',
        unfeature: 'unfeatured',
        delete: 'deleted'
      };
      
      toast.success(`${selectedProducts.length} products ${actionLabels[action]}`);
      onClearSelection();
      setBulkAction("");
    },
    onError: (error: any) => {
      toast.error(`Bulk action failed: ${error.message}`);
    },
  });

  const handleBulkAction = async (action: string) => {
    if (!selectedProducts.length) return;
    
    setIsProcessing(true);
    try {
      await bulkUpdateMutation.mutateAsync({ action, products: selectedProducts });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSelected = () => {
    // This would typically generate a CSV or Excel file
    toast.success(`Exporting ${selectedProducts.length} products...`);
  };

  if (selectedProducts.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary text-primary-foreground">
              {selectedProducts.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 flex-1">
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Bulk actions..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Activate Products
                  </div>
                </SelectItem>
                <SelectItem value="deactivate">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Deactivate Products
                  </div>
                </SelectItem>
                <SelectItem value="feature">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Mark as Featured
                  </div>
                </SelectItem>
                <SelectItem value="unfeature">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Remove Featured
                  </div>
                </SelectItem>
                <SelectItem value="export">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Selected
                  </div>
                </SelectItem>
                <SelectItem value="delete" className="text-destructive">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Products
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {bulkAction && (
              <div className="flex gap-2">
                {bulkAction === 'export' ? (
                  <Button
                    size="sm"
                    onClick={exportSelected}
                    disabled={isProcessing}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                ) : bulkAction === 'delete' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isProcessing}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete {selectedProducts.length}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Products</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedProducts.length} products? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleBulkAction('delete')}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete Products
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction(bulkAction)}
                    disabled={isProcessing}
                  >
                    Apply Action
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkAction("")}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};