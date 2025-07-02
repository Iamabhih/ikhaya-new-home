import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, X } from "lucide-react";

interface ProductQuickFormProps {
  onClose: () => void;
  productId?: string;
}

export const ProductQuickForm = ({ onClose, productId }: ProductQuickFormProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock_quantity: "0",
    category_id: "",
    sku: "",
    is_active: true,
    is_featured: false,
    short_description: "",
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-quick-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: product } = useQuery({
    queryKey: ['product-quick-edit', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Populate form with existing product data
  useState(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price?.toString() || "",
        stock_quantity: product.stock_quantity?.toString() || "0",
        category_id: product.category_id || "",
        sku: product.sku || "",
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
        short_description: product.short_description || "",
      });
    }
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (productId) {
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-filtered'] });
      queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      toast.success(productId ? 'Product updated successfully' : 'Product created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to ${productId ? 'update' : 'create'} product: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name),
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category_id: formData.category_id || null,
        sku: formData.sku.trim().toUpperCase() || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        short_description: formData.short_description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (!productId) {
        (submitData as any).created_at = new Date().toISOString();
      }

      await mutation.mutateAsync(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-center justify-between">
          <SheetTitle>{productId ? 'Edit Product' : 'Add New Product'}</SheetTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter product name"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price (R) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
              placeholder="0"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
            placeholder="ABC-123"
            maxLength={20}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="description">Short Description</Label>
          <Textarea
            id="description"
            value={formData.short_description}
            onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
            placeholder="Brief product description..."
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active Product</Label>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="featured">Featured Product</Label>
            <Switch
              id="featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {productId ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};