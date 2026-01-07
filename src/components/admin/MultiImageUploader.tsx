import React, { useState, useCallback } from 'react';
// import { useDropzone } from 'react-dropzone'; // TODO: Add react-dropzone dependency
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, File, Image as ImageIcon, Check } from 'lucide-react';

interface FileWithPreview extends File {
  preview?: string;
  altText?: string;
  id: string;
}

interface MultiImageUploaderProps {
  onUpload: (files: FileWithPreview[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

export const MultiImageUploader = ({ 
  onUpload, 
  maxFiles = 20, 
  maxSize = 50 * 1024 * 1024,
  disabled = false 
}: MultiImageUploaderProps) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file),
        altText: file.name.replace(/\.[^/.]+$/, ''),
        id: Math.random().toString(36).substring(2)
      }) as FileWithPreview;

      return fileWithPreview;
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  // Simplified file input without dropzone for now
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList) {
      onDrop(Array.from(fileList));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const updateAltText = (fileId: string, altText: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, altText } : f
    ));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onUpload(files);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Clean up previews
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      setFiles([]);
      toast.success(`Successfully uploaded ${files.length} images`);
    } catch (error) {
      toast.error('Failed to upload images');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearAll = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Simplified File Input */}
      <div className="border-2 border-dashed rounded-lg p-8 text-center border-muted-foreground/25 hover:border-primary/50">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          disabled={disabled || uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Click to select images
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Select multiple files ({maxFiles} max, {formatFileSize(maxSize)} per file)
          </p>
          <Button variant="outline" disabled={disabled || uploading}>
            Select Images
          </Button>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Selected Files ({files.length}/{maxFiles})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={uploading}
              >
                Clear All
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {files.length} file{files.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Uploading images... {uploadProgress}%
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image Preview */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <Badge variant="outline" className="text-xs">
                            {file.type.split('/')[1]?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* Alt Text Input */}
                      <div className="space-y-1">
                        <Label htmlFor={`alt-${file.id}`} className="text-xs">
                          Alt Text
                        </Label>
                        <Input
                          id={`alt-${file.id}`}
                          value={file.altText || ''}
                          onChange={(e) => updateAltText(file.id, e.target.value)}
                          placeholder="Describe this image..."
                          disabled={uploading}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};