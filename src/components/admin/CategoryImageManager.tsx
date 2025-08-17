import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Upload, Edit, Image as ImageIcon, X } from 'lucide-react';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const CategoryImageManager = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch all categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });

  // Update category image mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, imageUrl }: { categoryId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ image_url: imageUrl })
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] });
      toast({
        title: "Success",
        description: "Category image updated successfully.",
      });
      setDialogOpen(false);
      setImageUrl('');
      setSelectedCategory(null);
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove category image mutation
  const removeCategoryImageMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .update({ image_url: null })
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] });
      toast({
        title: "Success",
        description: "Category image removed successfully.",
      });
    },
    onError: (error) => {
      console.error('Error removing category image:', error);
      toast({
        title: "Error",
        description: "Failed to remove category image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCategory) return;

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `category-${selectedCategory.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully. Click 'Update Image' to save.",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setImageUrl(category.image_url || '');
    setDialogOpen(true);
  };

  const handleUpdateImage = () => {
    if (!selectedCategory) return;
    updateCategoryMutation.mutate({ 
      categoryId: selectedCategory.id, 
      imageUrl: imageUrl.trim() 
    });
  };

  const handleRemoveImage = (categoryId: string) => {
    removeCategoryImageMutation.mutate(categoryId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  const categoriesWithImages = categories?.filter(cat => cat.image_url) || [];
  const categoriesWithoutImages = categories?.filter(cat => !cat.image_url) || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Categories with Images
            </CardTitle>
            <CardDescription>
              {categoriesWithImages.length} categories have images assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{categoriesWithImages.length}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <X className="h-5 w-5" />
              Categories without Images
            </CardTitle>
            <CardDescription>
              {categoriesWithoutImages.length} categories need images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{categoriesWithoutImages.length}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Image Management</CardTitle>
          <CardDescription>
            Manage images for all categories. Upload new images or update existing ones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Image</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-muted-foreground">{category.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {category.image_url ? (
                      <div className="flex items-center gap-2">
                        <OptimizedImage
                          src={category.image_url}
                          alt={category.name}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                        <Badge variant="default">Has Image</Badge>
                      </div>
                    ) : (
                      <Badge variant="outline">No Image</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {category.image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage(category.id)}
                          disabled={removeCategoryImageMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? `Edit ${selectedCategory.name} Image` : 'Edit Category Image'}
            </DialogTitle>
            <DialogDescription>
              Upload a new image or enter an image URL for this category.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-upload">Upload Image</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="image-url">Or enter image URL</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            {imageUrl && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 border rounded-lg p-2">
                  <OptimizedImage
                    src={imageUrl}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="rounded object-cover mx-auto"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateImage}
                disabled={!imageUrl.trim() || updateCategoryMutation.isPending}
              >
                {updateCategoryMutation.isPending ? 'Updating...' : 'Update Image'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};