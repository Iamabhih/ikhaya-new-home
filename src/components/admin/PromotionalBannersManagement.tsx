import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Image, Calendar, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { BannerImageUpload } from "./BannerImageUpload";

type PromotionalBanner = Tables<"promotional_banners">;

export const PromotionalBannersManagement = () => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    image_url: "",
    background_color: "#ff4444",
    text_color: "#ffffff",
    overlay_opacity: 0.2,
    button_text: "",
    button_url: "",
    position: 0,
    is_active: true,
    start_date: "",
    end_date: ""
  });

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

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      image_url: "",
      background_color: "#ff4444",
      text_color: "#ffffff",
      overlay_opacity: 0.2,
      button_text: "",
      button_url: "",
      position: 0,
      is_active: true,
      start_date: "",
      end_date: ""
    });
    setEditingBanner(null);
  };

  const openEditDialog = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      image_url: banner.image_url || "",
      background_color: banner.background_color || "#ff4444",
      text_color: banner.text_color || "#ffffff",
      overlay_opacity: (banner as any).overlay_opacity ?? 0.2,
      button_text: banner.button_text || "",
      button_url: banner.button_url || "",
      position: banner.position,
      is_active: banner.is_active,
      start_date: banner.start_date ? banner.start_date.split('T')[0] : "",
      end_date: banner.end_date ? banner.end_date.split('T')[0] : ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast({
        title: "Error",
        description: "Failed to save banner",
        variant: "destructive"
      });
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

  const toggleActive = async (banner: PromotionalBanner) => {
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

  const movePosition = async (banner: PromotionalBanner, direction: "up" | "down") => {
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

  if (loading) {
    return <div className="flex justify-center p-8">Loading promotional banners...</div>;
  }

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
            <Button onClick={resetForm}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={formData.subtitle}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="button_text">Button Text</Label>
                      <Input
                        id="button_text"
                        value={formData.button_text}
                        onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="button_url">Button URL</Label>
                      <Input
                        id="button_url"
                        value={formData.button_url}
                        onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                        placeholder="/products"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="design" className="space-y-4">
                  <BannerImageUpload
                    currentImageUrl={formData.image_url}
                    onImageUpload={(imageUrl) => setFormData({ ...formData, image_url: imageUrl })}
                    onImageRemove={() => setFormData({ ...formData, image_url: "" })}
                  />
                  
                  <div>
                    <Label htmlFor="image_url">Or enter Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="background_color">Background Color</Label>
                      <Input
                        id="background_color"
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="text_color">Text Color</Label>
                      <Input
                        id="text_color"
                        type="color"
                        value={formData.text_color}
                        onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="overlay_opacity">Image Overlay Opacity ({Math.round(formData.overlay_opacity * 100)}%)</Label>
                    <Input
                      id="overlay_opacity"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.overlay_opacity}
                      onChange={(e) => setFormData({ ...formData, overlay_opacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>No overlay</span>
                      <span>Full overlay</span>
                    </div>
                  </div>
                  
                  {formData.background_color && (
                    <div className="p-4 rounded-lg relative overflow-hidden" style={{ backgroundColor: formData.background_color }}>
                      {formData.image_url && (
                        <>
                          <img 
                            src={formData.image_url} 
                            alt="Preview" 
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          {formData.overlay_opacity > 0 && (
                            <div 
                              className="absolute inset-0"
                              style={{ backgroundColor: 'black', opacity: formData.overlay_opacity }}
                            />
                          )}
                        </>
                      )}
                      <div className="relative z-10" style={{ color: formData.text_color }}>
                        <h3 className="font-bold text-lg">{formData.title || "Preview Title"}</h3>
                        {formData.subtitle && <p className="text-sm opacity-90">{formData.subtitle}</p>}
                        {formData.description && <p className="text-xs mt-1">{formData.description}</p>}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      type="number"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBanner ? "Update" : "Create"} Banner
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {banners.map((banner) => (
          <Card key={banner.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div 
                className="p-6 text-white relative"
                style={{ backgroundColor: banner.background_color, color: banner.text_color }}
              >
                {banner.image_url && (
                  <>
                    <div className="absolute inset-0">
                      <img 
                        src={banner.image_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {((banner as any).overlay_opacity ?? 0.2) > 0 && (
                      <div 
                        className="absolute inset-0"
                        style={{ 
                          backgroundColor: 'black', 
                          opacity: (banner as any).overlay_opacity ?? 0.2 
                        }}
                      />
                    )}
                  </>
                )}
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{banner.title}</h3>
                      {banner.subtitle && (
                        <p className="text-sm opacity-90">{banner.subtitle}</p>
                      )}
                      {banner.description && (
                        <p className="text-xs mt-2 opacity-80">{banner.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={banner.is_active ? "default" : "secondary"}>
                        {banner.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-white border-white/20">
                        Position {banner.position}
                      </Badge>
                    </div>
                  </div>
                  
                  {banner.button_text && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="pointer-events-none"
                    >
                      {banner.button_text}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {banner.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(banner.start_date).toLocaleDateString()}
                      </span>
                    )}
                    {banner.end_date && (
                      <span>→ {new Date(banner.end_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePosition(banner, "up")}
                      disabled={banner.position === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePosition(banner, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(banner)}
                    >
                      {banner.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(banner)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(banner.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {banners.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No promotional banners</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first promotional banner to start advertising sales and deals
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Banner
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};