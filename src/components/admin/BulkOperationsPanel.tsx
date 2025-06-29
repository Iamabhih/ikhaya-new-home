
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Loader2, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Package, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface BulkOperationsPanelProps {
  selectedProducts: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

interface BulkOperation {
  id: string;
  type: 'update' | 'delete' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  errors: string[];
}

export const BulkOperationsPanel = ({ 
  selectedProducts, 
  onClearSelection, 
  onRefresh 
}: BulkOperationsPanelProps) => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);
  
  // Bulk update states
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkFeatured, setBulkFeatured] = useState(false);
  
  // Export options
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFields, setExportFields] = useState<string[]>([
    'name', 'sku', 'price', 'stock_quantity', 'category'
  ]);

  const handleBulkUpdate = async (field: string, value: any) => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to update ${field} for ${selectedProducts.length} products?`
    );
    
    if (!confirmed) return;

    setIsProcessing(true);
    setActiveOperation({
      id: Date.now().toString(),
      type: 'update',
      status: 'processing',
      progress: 0,
      total: selectedProducts.length,
      errors: []
    });

    try {
      const updates: any = {};
      updates[field] = value;
      updates.updated_at = new Date().toISOString();

      // Process in batches to avoid timeouts
      const batchSize = 10;
      let processed = 0;
      const errors: string[] = [];

      for (let i = 0; i < selectedProducts.length; i += batchSize) {
        const batch = selectedProducts.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('products')
            .update(updates)
            .in('id', batch);

          if (error) {
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          }
        } catch (err: any) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
        }

        processed += batch.length;
        setActiveOperation(prev => prev ? {
          ...prev,
          progress: processed,
          errors
        } : null);
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      
      setActiveOperation(prev => prev ? {
        ...prev,
        status: errors.length > 0 ? 'failed' : 'completed'
      } : null);

      if (errors.length === 0) {
        toast.success(`Successfully updated ${processed} products`);
        onClearSelection();
      } else {
        toast.error(`Update completed with ${errors.length} errors`);
      }
      
      onRefresh();
    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast.error(`Bulk update failed: ${error.message}`);
      setActiveOperation(prev => prev ? {
        ...prev,
        status: 'failed',
        errors: [...(prev.errors || []), error.message]
      } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsProcessing(true);
    setActiveOperation({
      id: Date.now().toString(),
      type: 'delete',
      status: 'processing',
      progress: 0,
      total: selectedProducts.length,
      errors: []
    });

    try {
      // Delete in batches
      const batchSize = 5;
      let processed = 0;
      const errors: string[] = [];

      for (let i = 0; i < selectedProducts.length; i += batchSize) {
        const batch = selectedProducts.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .in('id', batch);

          if (error) {
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          }
        } catch (err: any) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
        }

        processed += batch.length;
        setActiveOperation(prev => prev ? {
          ...prev,
          progress: processed,
          errors
        } : null);
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      
      setActiveOperation(prev => prev ? {
        ...prev,
        status: errors.length > 0 ? 'failed' : 'completed'
      } : null);

      if (errors.length === 0) {
        toast.success(`Successfully deleted ${processed} products`);
        onClearSelection();
      } else {
        toast.error(`Delete completed with ${errors.length} errors`);
      }
      
      onRefresh();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast.error(`Bulk delete failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, sku, price, compare_at_price, stock_quantity, 
          is_active, is_featured, description, short_description,
          categories (name)
        `)
        .in('id', selectedProducts);

      if (error) throw error;

      // Generate CSV
      const headers = exportFields.map(field => {
        const fieldMap: { [key: string]: string } = {
          name: 'Name',
          sku: 'SKU',
          price: 'Price',
          compare_at_price: 'Compare At Price',
          stock_quantity: 'Stock Quantity',
          is_active: 'Active',
          is_featured: 'Featured',
          description: 'Description',
          short_description: 'Short Description',
          category: 'Category'
        };
        return fieldMap[field] || field;
      });

      const csvContent = [
        headers.join(','),
        ...products.map(product => 
          exportFields.map(field => {
            let value = '';
            if (field === 'category') {
              value = (product as any).categories?.name || '';
            } else {
              value = (product as any)[field] || '';
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${products.length} products successfully`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select products to perform bulk operations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bulk Operations ({selectedProducts.length} selected)</span>
          <Badge variant="outline">{selectedProducts.length} products</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Operation Status */}
        {activeOperation && (
          <Alert>
            <div className="flex items-center gap-2">
              {activeOperation.status === 'processing' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {activeOperation.status === 'completed' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {activeOperation.status === 'failed' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  Operation: {activeOperation.type} - {activeOperation.status}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(activeOperation.progress / activeOperation.total) * 100}%` 
                    }}
                  />
                </div>
                <div className="text-sm">
                  {activeOperation.progress} / {activeOperation.total} processed
                </div>
                {activeOperation.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    {activeOperation.errors.length} errors occurred
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Bulk Updates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Update Price</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="New price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
              <Button
                onClick={() => handleBulkUpdate('price', parseFloat(bulkPrice))}
                disabled={!bulkPrice || isProcessing}
                size="sm"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Update Stock</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Stock quantity"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
              />
              <Button
                onClick={() => handleBulkUpdate('stock_quantity', parseInt(bulkStock))}
                disabled={!bulkStock || isProcessing}
                size="sm"
              >
                <Package className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Update Status</Label>
            <div className="flex gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleBulkUpdate('is_active', bulkStatus === 'true')}
                disabled={!bulkStatus || isProcessing}
                size="sm"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Feature Products</Label>
            <div className="flex gap-2 items-center">
              <Checkbox
                checked={bulkFeatured}
                onCheckedChange={(checked) => setBulkFeatured(checked === true)}
              />
              <Button
                onClick={() => handleBulkUpdate('is_featured', bulkFeatured)}
                disabled={isProcessing}
                size="sm"
              >
                Set Featured
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleBulkExport}
            disabled={isProcessing}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
          
          <Button
            onClick={handleBulkDelete}
            disabled={isProcessing}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          
          <Button
            onClick={onClearSelection}
            variant="ghost"
          >
            Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
