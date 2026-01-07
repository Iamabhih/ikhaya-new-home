import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { BannerForm, BannerFormData } from "./banners/BannerForm";
import { BannerList } from "./banners/BannerList";

type PromotionalBanner = Tables<"promotional_banners">;

export const PromotionalBannersManagement = () => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("*")
        .order("position");

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast({
        title: "Error",
        description: "Failed to fetch promotional banners",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingBanner(null);
    setDialogOpen(true);
  };

  const handleEdit = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setDialogOpen(true);
  };

  const handleSave = async (formData: BannerFormData) => {
    try {
      const bannerData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("promotional_banners")
          .update(bannerData)
          .eq("id", editingBanner.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Banner updated successfully"
        });
      } else {
        const { error } = await supabase
          .from("promotional_banners")
          .insert([bannerData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Banner created successfully"
        });
      }

      setDialogOpen(false);
      setEditingBanner(null);
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast({
        title: "Error",
        description: "Failed to save banner",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      const { error } = await supabase
        .from("promotional_banners")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Banner deleted successfully"
      });
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (banner: PromotionalBanner) => {
    try {
      const { error } = await supabase
        .from("promotional_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);

      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner:", error);
      toast({
        title: "Error",
        description: "Failed to update banner status",
        variant: "destructive"
      });
    }
  };

  const handleMovePosition = async (banner: PromotionalBanner, direction: "up" | "down") => {
    const newPosition = direction === "up" ? banner.position - 1 : banner.position + 1;

    try {
      const { error } = await supabase
        .from("promotional_banners")
        .update({ position: newPosition })
        .eq("id", banner.id);

      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error("Error updating position:", error);
      toast({
        title: "Error",
        description: "Failed to update banner position",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Promotional Banners</h2>
          <p className="text-muted-foreground">
            Manage promotional banners for the homepage hero section
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Edit Banner" : "Create New Banner"}
              </DialogTitle>
            </DialogHeader>
            <BannerForm
              banner={editingBanner}
              onSave={handleSave}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <BannerList
        banners={banners}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onMovePosition={handleMovePosition}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};
