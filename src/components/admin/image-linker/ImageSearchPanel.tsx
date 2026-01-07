import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Image as ImageIcon,
  RefreshCw,
  Eye,
  ExternalLink,
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { CachedImage } from "./ImageLinkingPreview";

interface ImageSearchPanelProps {
  images: CachedImage[];
  isLoading: boolean;
  selectedImage: CachedImage | null;
  selectedImages: string[];
  onImageSelect: (id: string, checked: boolean) => void;
  onImageClick: (image: CachedImage) => void;
  onPreview: (image: CachedImage) => void;
  onDelete: (imageIds: string[]) => void;
  onRefresh: () => void;
  onSelectAll: () => void;
  isDeleting: boolean;
}

export const ImageSearchPanel = ({
  images,
  isLoading,
  selectedImage,
  selectedImages,
  onImageSelect,
  onImageClick,
  onPreview,
  onDelete,
  onRefresh,
  onSelectAll,
  isDeleting
}: ImageSearchPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Cached Images ({images.length.toLocaleString()})
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onSelectAll}
              disabled={images.filter(img => !img.is_linked).length === 0}
            >
              Select All Unlinked
            </Button>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Images discovered from Google Drive scans with enhanced filtering and bulk operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading cached images...
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cached images found. Run a Google Drive migration to populate this list.
            </div>
          ) : (
            <div className="space-y-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedImage?.id === image.id
                      ? 'border-primary bg-primary/5'
                      : selectedImages.includes(image.id)
                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-950'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onImageClick(image)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onImageSelect(image.id, e.target.checked);
                        }}
                        className="mt-1"
                        disabled={image.is_linked}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{image.filename}</p>
                          {image.is_linked ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unlinked
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {image.sku && <p>SKU: {image.sku}</p>}
                          <p>Type: {image.mime_type}</p>
                          <p>Size: {image.file_size ? Math.round(image.file_size / 1024) + ' KB' : 'Unknown'}</p>
                          <p>Scanned: {new Date(image.created_at).toLocaleDateString()}</p>
                          {image.linked_at && (
                            <p>Linked: {new Date(image.linked_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(image);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(image.direct_url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      {!image.is_linked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Remove this image from cache?')) {
                              onDelete([image.id]);
                            }
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
