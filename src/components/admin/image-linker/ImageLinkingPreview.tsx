import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface CachedImage {
  id: string;
  sku?: string;
  filename: string;
  drive_id: string;
  direct_url: string;
  file_size?: number;
  mime_type: string;
  scan_session_id?: string;
  is_linked: boolean;
  linked_product_id?: string;
  linked_at?: string;
  linked_by?: string;
  created_at: string;
  metadata?: any;
}

interface ImageLinkingPreviewProps {
  image: CachedImage | null;
  open: boolean;
  onClose: () => void;
}

export const ImageLinkingPreview = ({ image, open, onClose }: ImageLinkingPreviewProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{image?.filename}</DialogTitle>
          <DialogDescription>
            Preview of cached image from Google Drive with enhanced details
          </DialogDescription>
        </DialogHeader>
        {image && (
          <div className="space-y-4">
            <img
              src={image.direct_url}
              alt={image.filename}
              className="w-full h-auto max-h-96 object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Filename:</strong> {image.filename}
              </div>
              <div>
                <strong>SKU:</strong> {image.sku || 'Not detected'}
              </div>
              <div>
                <strong>Type:</strong> {image.mime_type}
              </div>
              <div>
                <strong>Size:</strong> {image.file_size ? Math.round(image.file_size / 1024) + ' KB' : 'Unknown'}
              </div>
              <div>
                <strong>Status:</strong> {image.is_linked ? 'Linked' : 'Unlinked'}
              </div>
              <div>
                <strong>Scanned:</strong> {new Date(image.created_at).toLocaleString()}
              </div>
              {image.linked_at && (
                <>
                  <div>
                    <strong>Linked:</strong> {new Date(image.linked_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>Linked to:</strong> Product ID {image.linked_product_id}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.open(image?.direct_url, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Drive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export type { CachedImage };
