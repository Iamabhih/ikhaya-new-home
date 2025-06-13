import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { validatePrice, validateQuantity, validateSKU, sanitizeContent } from "@/utils/validation";
import { SecureForm } from "@/components/security/SecureForm";
import { useSecurityContext } from "@/contexts/SecurityContext";
import { useRateLimit } from "@/hooks/useRateLimit";
import { ProductImageManager } from "./ProductImageManager";
import { AlertTriangle } from "lucide-react";

interface ProductFormProps {
  productId?: string;
  onClose: () => void;
}

export const ProductForm = ({ productId, onClose }: ProductFormProps) => {
  const queryClient = useQueryClient();
  const { validateCSRFToken } = useSecurityContext();
  const { canAttempt, recordAttempt, isBlocked, getRemainingTime } = useRateLimit(5, 60000);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    price: "",
    compare_at_price: "",
    category_id: "",
    sku: "",
    stock_quantity: "",
    is_active: true,
    is_featured: false,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: product } = useQuery({
    queryKey: ['product', productId],
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

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        description: product.description || "",
        short_description: product.short_description || "",
        price: product.price?.toString() || "",
        compare_at_price: product.compare_at_price?.toString() || "",
        category_id: product.category_id || "",
        sku: product.sku || "",
        stock_quantity: product.stock_quantity?.toString() || "",
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
      });
    }
  }, [product]);

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.name.trim() || formData.name.length > 255) {
      errors.push("Product name is required and must be under 255 characters");
    }
    
    if (!formData.slug.trim() || !/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.push("Slug is required and must contain only lowercase letters, numbers, and hyphens");
    }
    
    if (!validatePrice(formData.price)) {
      errors.push("Price must be a positive number between 0.01 and 1,000,000");
    }
    
    if (formData.compare_at_price && !validatePrice(formData.compare_at_price)) {
      errors.push("Compare at price must be a positive number between 0.01 and 1,000,000");
    }
    
    if (!validateQuantity(formData.stock_quantity)) {
      errors.push("Stock quantity must be a positive integer between 1 and 10,000");
    }
    
    if (formData.sku && !validateSKU(formData.sku)) {
      errors.push("SKU must be 3-20 characters containing only uppercase letters, numbers, hyphens, and underscores");
    }
    
    if (formData.description.length > 5000) {
      errors.push("Description must be under 5000 characters");
    }
    
    if (formData.short_description.length > 500) {
      errors.push("Short description must be under 500 characters");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('products').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to create product');
      console.error(error);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Product updated successfully');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update product');
      console.error(error);
    },
  });

  const handleSecureSubmit = (e: React.FormEvent, csrfToken: string) => {
    console.log('Secure form submission with CSRF token:', csrfToken);
    
    if (!canAttempt) {
      const remainingTime = getRemainingTime();
      toast.error(`Too many attempts. Please wait ${remainingTime} seconds.`);
      return;
    }

    if (!validateCSRFToken(csrfToken)) {
      toast.error('Security validation failed. Please refresh and try again.');
      return;
    }
    
    if (!validateForm()) {
      recordAttempt();
      return;
    }
    
    const submitData = {
      name: formData.name.trim(),
      slug: formData.slug.trim().toLowerCase(),
      description: sanitizeContent(formData.description),
      short_description: sanitizeContent(formData.short_description),
      price: parseFloat(formData.price),
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      category_id: formData.category_id || null,
      sku: formData.sku.trim().toUpperCase() || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
    };

    if (productId) {
      updateProductMutation.mutate(submitData);
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value)
    }));
  };

  if (isBlocked) {
    const remainingTime = getRemainingTime();
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Too many attempts. Please wait {remainingTime} seconds before trying again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{productId ? 'Edit Product' : 'Create New Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Product Details</TabsTrigger>
            {productId && <TabsTrigger value="images">Images</TabsTrigger>}
          </TabsList>

          <TabsContent value="details">
            <SecureForm onSecureSubmit={handleSecureSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    maxLength={255}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    maxLength={100}
                    pattern="^[a-z0-9-]+$"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="short_description">Short Description</Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                  maxLength={500}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={5000}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price (R)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1000000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="compare_at_price">Compare At Price (R)</Label>
                  <Input
                    id="compare_at_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1000000"
                    value={formData.compare_at_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    max="10000"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
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
                    pattern="^[A-Z0-9-_]{3,20}$"
                    maxLength={20}
                    placeholder="ABC-123"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                >
                  {productId ? 'Update' : 'Create'} Product
                </Button>
              </div>
            </SecureForm>
          </TabsContent>

          {productId && (
            <TabsContent value="images">
              <ProductImageManager productId={productId} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
