import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Zap } from "lucide-react";
import { Product } from "./BulkOperationsAlert";
import { CachedImage } from "./ImageLinkingPreview";

interface LinkingActionCardProps {
  selectedImage: CachedImage | null;
  selectedProduct: Product | null;
  selectedUnlinkedCount: number;
  isLinking: boolean;
  isBulkLinking: boolean;
  onLinkImage: () => void;
  onBulkLink: () => void;
}

export const LinkingActionCard = ({
  selectedImage,
  selectedProduct,
  selectedUnlinkedCount,
  isLinking,
  isBulkLinking,
  onLinkImage,
  onBulkLink
}: LinkingActionCardProps) => {
  const shouldShow = (selectedImage && selectedProduct && !selectedImage.is_linked) ||
                     (selectedUnlinkedCount > 0 && selectedProduct);

  if (!shouldShow || !selectedProduct) return null;

  const isSingleImage = selectedImage && selectedUnlinkedCount === 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Ready to link:</p>
            {isSingleImage && selectedImage ? (
              <p className="text-sm text-muted-foreground">
                {selectedImage.filename} → {selectedProduct.name} ({selectedProduct.sku})
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedUnlinkedCount} images → {selectedProduct.name} ({selectedProduct.sku})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isSingleImage ? (
              <Button
                onClick={onLinkImage}
                disabled={isLinking}
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                {isLinking ? 'Linking...' : 'Link Image'}
              </Button>
            ) : (
              <Button
                onClick={onBulkLink}
                disabled={isBulkLinking}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {isBulkLinking ? 'Linking...' : `Link ${selectedUnlinkedCount} Images`}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
