import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Trash2, Plus, GripVertical, Image, ImageOff, Settings, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Textarea } from "@/components/ui/textarea";

export const HomepageSettings = () => {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productSelectOpen, setProductSelectOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const { settings, isLoading: settingsLoading, updateSetting, isUpdating } = useSiteSettings();

  // Fetch featured categories
  const { data: featuredCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['homepage-featured-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_featured_categories')
        .select(`
          id,
          display_order,
          is_active,
          categories:category_id(id, name, slug)
        `)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch featured products with image count
  const { data: featuredProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['homepage-featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_featured_products')
        .select(`
          id,
          display_order,
          is_active,
          products:product_id(
            id, 
            name, 
            slug, 
            price,
            product_images(id)
          )
        `)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all categories for selection
  const { data: allCategories = [] } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all products for selection
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['all-products-with-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          sku,
          product_images:product_images(id, image_url, is_primary)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(product => ({
        ...product,
        product_images: product.product_images || []
      }));
    }
  });

  // Add featured category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('homepage_featured_categories')
        .insert({
          category_id: categoryId,
          display_order: featuredCategories.length
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-featured-categories'] });
      setSelectedCategoryId("");
      toast({ title: "Success", description: "Category added to homepage" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Add featured product mutation
  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('homepage_featured_products')
        .insert({
          product_id: productId,
          display_order: featuredProducts.length
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-featured-products'] });
      setSelectedProductId("");
      toast({ title: "Success", description: "Product added to featured" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Remove featured category mutation
  const removeCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homepage_featured_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-featured-categories'] });
      toast({ title: "Success", description: "Category removed from homepage" });
    }
  });

  // Remove featured product mutation
  const removeProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homepage_featured_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-featured-products'] });
      toast({ title: "Success", description: "Product removed from featured" });
    }
  });

  // Update display order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ table, items }: { table: 'homepage_featured_categories' | 'homepage_featured_products'; items: any[] }) => {
      const updates = items.map((item, index) => ({
        id: item.id,
        display_order: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from(table)
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-featured-categories'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-featured-products'] });
    }
  });

  const handleCategoryDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(featuredCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateOrderMutation.mutate({ table: 'homepage_featured_categories', items });
  };

  const handleProductDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(featuredProducts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateOrderMutation.mutate({ table: 'homepage_featured_products', items });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homepage Settings</h1>
          <p className="text-muted-foreground">
            Configure featured products, categories, and site behavior
          </p>
        </div>
      </div>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Site Settings
          </CardTitle>
          <CardDescription>
            Configure global site behavior and customer-facing features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Banner Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Maintenance Banner</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <Label htmlFor="maintenance-banner-enabled" className="text-base font-medium">
                    Show maintenance banner
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Display a maintenance banner across the top of all customer-facing pages
                </p>
              </div>
              <Switch
                id="maintenance-banner-enabled"
                checked={settings?.maintenance_banner_enabled === true}
                onCheckedChange={(checked) => updateSetting('maintenance_banner_enabled', checked)}
                disabled={settingsLoading || isUpdating}
              />
            </div>
            
            {settings?.maintenance_banner_enabled && (
              <div className="space-y-2">
                <Label htmlFor="maintenance-banner-text" className="text-sm font-medium">
                  Banner message
                </Label>
                <Textarea
                  id="maintenance-banner-text"
                  value={settings?.maintenance_banner_text || ""}
                  onChange={(e) => updateSetting('maintenance_banner_text', e.target.value)}
                  placeholder="Enter the maintenance banner message..."
                  disabled={settingsLoading || isUpdating}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  This message will appear at the top of all customer-facing pages
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Products Without Images Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <ImageOff className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="hide-products-without-images" className="text-base font-medium">
                  Hide products without images
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, products without images will be hidden from all customer-facing areas (homepage, product listings, search results, etc.)
              </p>
            </div>
            <Switch
              id="hide-products-without-images"
              checked={settings?.hide_products_without_images === true}
              onCheckedChange={(checked) => updateSetting('hide_products_without_images', checked)}
              disabled={settingsLoading || isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />
      
      {/* Featured Categories Section */}
      <Card>
        <CardHeader>
          <CardTitle>Shop by Category</CardTitle>
          <p className="text-muted-foreground">Manage which categories appear in the homepage category grid</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a category to add" />
              </SelectTrigger>
              <SelectContent>
                {allCategories
                  .filter(cat => !featuredCategories.some(fc => fc.categories?.id === cat.id))
                  .map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => selectedCategoryId && addCategoryMutation.mutate(selectedCategoryId)}
              disabled={!selectedCategoryId || addCategoryMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          <DragDropContext onDragEnd={handleCategoryDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {featuredCategories.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{item.categories?.name}</span>
                            <Badge variant="secondary">Order: {item.display_order}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategoryMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Featured Products Section */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Products</CardTitle>
          <p className="text-muted-foreground">Manage which products appear in the featured products section</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Popover open={productSelectOpen} onOpenChange={setProductSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productSelectOpen}
                  className="flex-1 justify-between"
                  disabled={productsLoading}
                >
                  {productsLoading ? (
                    "Loading products..."
                  ) : selectedProductId ? (
                    allProducts.find((product: any) => product.id === selectedProductId)?.name || "Product not found"
                  ) : (
                    "Select a product to add"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-4 space-y-4">
                  <Input
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full"
                  />
                  
                  <div className="max-h-64 overflow-auto space-y-1">
                    {productsLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading products...
                      </div>
                    ) : (() => {
                      const availableProducts = allProducts
                        .filter((prod: any) => 
                          prod && 
                          prod.id && 
                          !featuredProducts.some(fp => fp.products?.id === prod.id) &&
                          (productSearchTerm === "" || 
                           prod.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                           prod.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        );

                      if (availableProducts.length === 0) {
                        return (
                          <div className="p-4 text-center text-muted-foreground">
                            {productSearchTerm ? "No products match your search" : "No products available to add"}
                          </div>
                        );
                      }

                      return availableProducts.map((product: any) => {
                        const imageCount = product.product_images?.length || 0;
                        const hasImages = Array.isArray(product.product_images) && product.product_images.length > 0;
                        const primaryImage = hasImages ? 
                          (product.product_images.find((img: any) => img?.is_primary) || product.product_images[0]) : 
                          null;

                        return (
                          <div
                            key={`product-${product.id}`}
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setProductSelectOpen(false);
                              setProductSearchTerm("");
                            }}
                            className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            
                            {/* Product image thumbnail or placeholder */}
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-[hsl(var(--product-image-bg))] flex items-center justify-center flex-shrink-0">
                              {hasImages && primaryImage?.image_url ? (
                                <img 
                                  src={primaryImage.image_url} 
                                  alt={product.name || "Product"}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ImageOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            
                            {/* Product details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{product.name || "Unnamed Product"}</span>
                                {hasImages && (
                                  <Image className="h-4 w-4 text-green-500 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>R{product.price || "0"}</span>
                                {product.sku && (
                                  <>
                                    <span>•</span>
                                    <span>{product.sku}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className={hasImages ? "text-green-600" : "text-amber-600"}>
                                  {hasImages ? `${product.product_images.length} image${product.product_images.length > 1 ? 's' : ''}` : 'No images'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              onClick={() => selectedProductId && addProductMutation.mutate(selectedProductId)}
              disabled={!selectedProductId || addProductMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          <DragDropContext onDragEnd={handleProductDragEnd}>
            <Droppable droppableId="products">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {featuredProducts.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{item.products?.name}</span>
                            <Badge variant="secondary">R{item.products?.price}</Badge>
                            {item.products?.product_images && item.products.product_images.length > 0 ? (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <Image className="h-3 w-3 mr-1" />
                                {item.products.product_images.length}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                <ImageOff className="h-3 w-3 mr-1" />
                                No images
                              </Badge>
                            )}
                            <Badge variant="outline">Order: {item.display_order}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
};