
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';

interface BulkImageManagerProps {
  selectedImages: string[];
  onBulkDelete: (imageIds: string[]) => Promise<void>;
  onBulkUpload: (files: File[]) => Promise<void>;
  onClearSelection: () => void;
}

export const BulkImageManager = ({
  selectedImages,
  onBulkDelete,
  onBulkUpload,
  onClearSelection
}: BulkImageManagerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}?`
    );
    
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await onBulkDelete(selectedImages);
      toast.success(`Successfully deleted ${selectedImages.length} images`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to delete images');
      console.error('Bulk delete error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const batchSize = 3; // Process 3 files at a time
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await onBulkUpload(batch);
        setProgress(((i + batch.length) / files.length) * 100);
      }
      
      toast.success(`Successfully uploaded ${files.length} images`);
    } catch (error) {
      toast.error('Failed to upload some images');
      console.error('Bulk upload error:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  if (selectedImages.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">
          Bulk Actions ({selectedImages.length} selected)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleBulkUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            <Button variant="outline" size="sm" disabled={isProcessing}>
              <Upload className="h-4 w-4 mr-2" />
              Add More Images
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            Clear Selection
          </Button>
        </div>

        {isProcessing && progress > 0 && (
          <div className="mt-3">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground mt-1">
              Uploading... {Math.round(progress)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
