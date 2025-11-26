import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package,
  Send,
  Download,
  X,
  CheckCircle,
  Clock,
  Truck
} from "lucide-react";

interface BulkOrderActionsProps {
  selectedOrders: string[];
  onUpdateStatus: (status: string, notes?: string) => void;
  onClearSelection: () => void;
}

export const BulkOrderActions = ({ 
  selectedOrders, 
  onUpdateStatus, 
  onClearSelection 
}: BulkOrderActionsProps) => {
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const handleBulkUpdate = () => {
    if (bulkStatus) {
      onUpdateStatus(bulkStatus, bulkNotes || undefined);
      setBulkStatus("");
      setBulkNotes("");
      setShowNotes(false);
    }
  };

  const statusOptions = [
    { value: "processing", label: "Mark as Processing", icon: Clock },
    { value: "shipped", label: "Mark as Shipped", icon: Truck },
    { value: "delivered", label: "Mark as Delivered", icon: CheckCircle },
    { value: "completed", label: "Mark as Completed", icon: Package },
    { value: "cancelled", label: "Mark as Cancelled", icon: X },
  ];

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkStatus(option.value);
                    setShowNotes(true);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              );
            })}
          </div>

          {showNotes && (
            <div className="space-y-2 p-4 border rounded-lg bg-background">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Updating {selectedOrders.length} orders to "{bulkStatus}"
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNotes(false);
                    setBulkStatus("");
                    setBulkNotes("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Textarea
                placeholder="Add a note about this status change (optional)..."
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                rows={3}
              />
              
              <div className="flex gap-2">
                <Button onClick={handleBulkUpdate}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Orders
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotes(false);
                    setBulkStatus("");
                    setBulkNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Bulk email feature coming soon")}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Bulk Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Export feature coming soon")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};