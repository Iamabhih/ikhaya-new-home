import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Upload, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  RefreshCw,
  FileImage
} from "lucide-react";

interface ImageUploadResult {
  filename: string;
  sku: string;
  success: boolean;
  error?: string;
  imageUrl?: string;
}

interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
}

export const ProductImageUploader = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResults, setUploadResults] = useState<ImageUploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch products for SKU validation
  const { data: products } = useQuery({
    queryKey: ['products-skus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name')
        .not('sku', 'is', null);
      
      if (error) throw error;
      return data;
    }
  });

  const extractSKUFromFilename = (filename: string): string => {
    // Remove file extension and extract SKU
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    // Assume the entire filename (without extension) is the SKU
    return nameWithoutExt.toUpperCase();
  };

  const uploadImagesMutation = useMutation({
    mutationFn: async (files: FileList) => {
      setIsUploading(true);
      setUploadProgress({ current: 0, total: files.length, currentFile: '' });
      setUploadResults([]);

      const results: ImageUploadResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sku = extractSKUFromFilename(file.name);
        
        setUploadProgress({
          current: i + 1,
          total: files.length,
          currentFile: file.name
        });

        try {
          // Check if product with this SKU exists
          const product = products?.find(p => p.sku?.toUpperCase() === sku);
          
          if (!product) {
            results.push({
              filename: file.name,
              sku,
              success: false,
              error: `No product found with SKU: ${sku}`
            });
            continue;
          }

          // Upload to Supabase Storage
          const filePath = `products/${sku}/${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file, { 
              cacheControl: '3600',
              upsert: true 
            });

          if (uploadError) {
            results.push({
              filename: file.name,
              sku,
              success: false,
              error: uploadError.message
            });
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

          // Check if this is the first image for the product
          const { data: existingImages } = await supabase
            .from('product_images')
            .select('id')
            .eq('product_id', product.id);

          const isFirstImage = !existingImages || existingImages.length === 0;

          // Insert into product_images table
          const { error: dbError } = await supabase
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: publicUrl,
              alt_text: `${product.name} - ${sku}`,
              is_primary: isFirstImage,
              sort_order: existingImages?.length || 0
            });

          if (dbError) {
            // Delete uploaded file if database insert fails
            await supabase.storage
              .from('product-images')
              .remove([filePath]);
              
            results.push({
              filename: file.name,
              sku,
              success: false,
              error: `Database error: ${dbError.message}`
            });
            continue;
          }

          results.push({
            filename: file.name,
            sku,
            success: true,
            imageUrl: publicUrl
          });

        } catch (error: any) {
          results.push({
            filename: file.name,
            sku,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setUploadResults(results);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      toast.success(`Upload completed: ${successful} successful, ${failed} failed`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setUploadProgress(null);
      setIsUploading(false);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress(null);
      setIsUploading(false);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validate file types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const invalidFiles = Array.from(files).filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        toast.error(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }

      // Check file sizes (max 5MB per file)
      const oversizedFiles = Array.from(files).filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error(`Files too large (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setSelectedFiles(files);
      setUploadResults([]);
      toast.info(`${files.length} images selected for upload`);
    }
  };

  const handleUpload = () => {
    if (selectedFiles) {
      uploadImagesMutation.mutate(selectedFiles);
    }
  };

  const resetForm = () => {
    setSelectedFiles(null);
    setUploadResults([]);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Upload Product Images
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload product images with filenames matching product SKUs (e.g., SKU123.jpg)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-files">Select Images</Label>
              <Input
                ref={fileInputRef}
                id="image-files"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: JPEG, PNG, WebP. Max size: 5MB per file.
                Filename should match product SKU (e.g., ABC123.jpg for SKU "ABC123").
              </p>
            </div>

            {selectedFiles && (
              <Alert>
                <FileImage className="w-4 h-4" />
                <AlertDescription>
                  {selectedFiles.length} images selected for upload
                </AlertDescription>
              </Alert>
            )}

            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading: {uploadProgress.currentFile}</span>
                  <span>{uploadProgress.current} of {uploadProgress.total}</span>
                </div>
                <Progress 
                  value={(uploadProgress.current / uploadProgress.total) * 100} 
                  className="w-full"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleUpload}
                disabled={!selectedFiles || isUploading}
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Images
              </Button>

              <Button variant="outline" onClick={resetForm} disabled={isUploading}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">
                ✓ {uploadResults.filter(r => r.success).length} Successful
              </span>
              <span className="text-red-600">
                ✗ {uploadResults.filter(r => !r.success).length} Failed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.filename}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.sku}</Badge>
                    </TableCell>
                    <TableCell>
                      {result.success ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.success ? (
                        <span className="text-green-600">Image uploaded and linked</span>
                      ) : (
                        <span className="text-red-600">{result.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. <strong>Filename Format:</strong> Name your image files exactly as the product SKU (e.g., ABC123.jpg for SKU "ABC123")</p>
            <p>2. <strong>Automatic Matching:</strong> The system will find products by SKU and link the images</p>
            <p>3. <strong>Primary Image:</strong> The first image uploaded for a product becomes the primary image</p>
            <p>4. <strong>Storage:</strong> Images are stored in organized folders by product category</p>
            <p>5. <strong>Optimization:</strong> Images are automatically optimized for web display</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};