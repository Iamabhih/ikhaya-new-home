import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export const HomepageSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

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

  // Fetch featured products
  const { data: featuredProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['homepage-featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_featured_products')
        .select(`
          id,
          display_order,
          is_active,
          products:product_id(id, name, slug, price)
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
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
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
      <h1 className="text-3xl font-bold">Homepage Settings</h1>
      
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
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a product to add" />
              </SelectTrigger>
              <SelectContent>
                {allProducts
                  .filter(prod => !featuredProducts.some(fp => fp.products?.id === prod.id))
                  .map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - R{product.price}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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