import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Target, Link, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface BulkOperation {
  type: 'link' | 'delete' | 'download';
  selectedItems: string[];
  inProgress: boolean;
  progress: number;
  total: number;
}

interface BulkOperationsAlertProps {
  selectedCount: number;
  selectedUnlinkedCount: number;
  selectedProduct: Product | null;
  bulkOperation: BulkOperation | null;
  isLinking: boolean;
  isDeleting: boolean;
  onClearSelection: () => void;
  onBulkLink: () => void;
  onBulkDelete: () => void;
}

export const BulkOperationsAlert = ({
  selectedCount,
  selectedUnlinkedCount,
  selectedProduct,
  bulkOperation,
  isLinking,
  isDeleting,
  onClearSelection,
  onBulkLink,
  onBulkDelete
}: BulkOperationsAlertProps) => {
  if (selectedCount === 0) return null;

  return (
    <Alert>
      <Target className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>{selectedCount} images selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onClearSelection}>
              Clear
            </Button>
            {selectedUnlinkedCount > 0 && selectedProduct && (
              <Button
                size="sm"
                onClick={onBulkLink}
                disabled={isLinking}
                className="flex items-center gap-1"
              >
                <Link className="h-3 w-3" />
                Link to {selectedProduct.name}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={onBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
        {bulkOperation && (
          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{bulkOperation.type === 'link' ? 'Linking' : 'Deleting'} images...</span>
              <span>{bulkOperation.progress}/{bulkOperation.total}</span>
            </div>
            <Progress value={(bulkOperation.progress / bulkOperation.total) * 100} className="h-2" />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export type { Product, BulkOperation };
