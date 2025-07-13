import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeliveryZone {
  id: string;
  name: string;
  description: string | null;
  min_order_value: number;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DeliveryZoneFormData {
  name: string;
  description: string;
  min_order_value: number;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  sort_order: number;
}

export const DeliveryZoneManagement = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState<DeliveryZoneFormData>({
    name: "",
    description: "",
    min_order_value: 0,
    delivery_fee: 0,
    free_delivery_threshold: null,
    estimated_days_min: 1,
    estimated_days_max: 3,
    is_active: true,
    sort_order: 0,
  });
  const { toast } = useToast();

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error("Error fetching delivery zones:", error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery zones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      min_order_value: 0,
      delivery_fee: 0,
      free_delivery_threshold: null,
      estimated_days_min: 1,
      estimated_days_max: 3,
      is_active: true,
      sort_order: 0,
    });
    setEditingZone(null);
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || "",
      min_order_value: zone.min_order_value,
      delivery_fee: zone.delivery_fee,
      free_delivery_threshold: zone.free_delivery_threshold,
      estimated_days_min: zone.estimated_days_min,
      estimated_days_max: zone.estimated_days_max,
      is_active: zone.is_active,
      sort_order: zone.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Zone name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const zoneData = {
        ...formData,
        description: formData.description || null,
        free_delivery_threshold: formData.free_delivery_threshold || null,
      };

      if (editingZone) {
        const { error } = await supabase
          .from("delivery_zones")
          .update(zoneData)
          .eq("id", editingZone.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Delivery zone updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("delivery_zones")
          .insert([zoneData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Delivery zone created successfully",
        });
      }

      fetchZones();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving delivery zone:", error);
      toast({
        title: "Error",
        description: "Failed to save delivery zone",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this delivery zone?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("delivery_zones")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Delivery zone deleted successfully",
      });
      fetchZones();
    } catch (error) {
      console.error("Error deleting delivery zone:", error);
      toast({
        title: "Error",
        description: "Failed to delete delivery zone",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading delivery zones...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Delivery Zones</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? "Edit Delivery Zone" : "Add Delivery Zone"}
              </DialogTitle>
              <DialogDescription>
                Configure delivery options and pricing for different zones.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Local Delivery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_fee">Delivery Fee (R)</Label>
                  <Input
                    id="delivery_fee"
                    type="number"
                    step="0.01"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_order_value">Min Order (R)</Label>
                  <Input
                    id="min_order_value"
                    type="number"
                    step="0.01"
                    value={formData.min_order_value}
                    onChange={(e) => setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="free_delivery_threshold">Free Delivery Threshold (R)</Label>
                <Input
                  id="free_delivery_threshold"
                  type="number"
                  step="0.01"
                  value={formData.free_delivery_threshold || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    free_delivery_threshold: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_days_min">Min Days</Label>
                  <Input
                    id="estimated_days_min"
                    type="number"
                    value={formData.estimated_days_min}
                    onChange={(e) => setFormData({ ...formData, estimated_days_min: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_days_max">Max Days</Label>
                  <Input
                    id="estimated_days_max"
                    type="number"
                    value={formData.estimated_days_max}
                    onChange={(e) => setFormData({ ...formData, estimated_days_max: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingZone ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {zones.map((zone) => (
          <Card key={zone.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {zone.name}
                    <Badge variant={zone.is_active ? "default" : "secondary"}>
                      {zone.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {zone.description}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(zone)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(zone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Delivery Fee:</span>
                  <p className="text-muted-foreground">R{zone.delivery_fee.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium">Min Order:</span>
                  <p className="text-muted-foreground">R{zone.min_order_value.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium">Free Delivery:</span>
                  <p className="text-muted-foreground">
                    {zone.free_delivery_threshold ? `R${zone.free_delivery_threshold.toFixed(2)}+` : "Not available"}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Delivery Time:</span>
                  <p className="text-muted-foreground">
                    {zone.estimated_days_min === zone.estimated_days_max 
                      ? `${zone.estimated_days_min} day${zone.estimated_days_min > 1 ? 's' : ''}`
                      : `${zone.estimated_days_min}-${zone.estimated_days_max} days`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {zones.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No delivery zones configured. Create your first zone to get started.
        </div>
      )}
    </div>
  );
};