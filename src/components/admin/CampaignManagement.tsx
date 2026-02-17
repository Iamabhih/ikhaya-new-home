import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Trash2,
  Plus,
  GripVertical,
  Image,
  ImageOff,
  Pencil,
  X,
  Save,
  Flame,
  Calendar,
  Palette,
  Tag,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CampaignForm {
  name: string;
  description: string;
  theme: string;
  banner_image_url: string;
  background_color: string;
  accent_color: string;
  text_color: string;
  badge_text: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const defaultCampaignForm: CampaignForm = {
  name: "",
  description: "",
  theme: "default",
  banner_image_url: "",
  background_color: "#1a1a2e",
  accent_color: "#e94560",
  text_color: "#ffffff",
  badge_text: "CAMPAIGN",
  start_date: "",
  end_date: "",
  is_active: true,
};

const themePresets = [
  { name: "Dark Elegance", bg: "#1a1a2e", accent: "#e94560", text: "#ffffff" },
  { name: "Midnight Blue", bg: "#0f0e17", accent: "#ff8906", text: "#fffffe" },
  { name: "Forest Green", bg: "#1b2d2a", accent: "#f4a261", text: "#e6e6e6" },
  { name: "Royal Purple", bg: "#2d1b69", accent: "#ff6b6b", text: "#f0e6ff" },
  { name: "Warm Earth", bg: "#3d2c2e", accent: "#d4a574", text: "#f5f0eb" },
  { name: "Ocean Deep", bg: "#0a192f", accent: "#64ffda", text: "#ccd6f6" },
  { name: "Sunset Glow", bg: "#2b1055", accent: "#d53369", text: "#ffe0f0" },
  { name: "Clean White", bg: "#f8f9fa", accent: "#e63946", text: "#1d3557" },
];

export const CampaignManagement = () => {
  const queryClient = useQueryClient();
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(defaultCampaignForm);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [productSelectOpen, setProductSelectOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [campaignPrice, setCampaignPrice] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [duplicateDialogId, setDuplicateDialogId] = useState<string | null>(null);

  // Fetch all campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_products(
            id,
            campaign_price,
            discount_percentage,
            display_order,
            is_active,
            products:product_id(
              id, name, slug, price, sku,
              product_images(id, image_url, is_primary)
            )
          )
        `)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        campaign_products: (c.campaign_products || []).sort(
          (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
        ),
      }));
    },
  });

  // Fetch all products for selection
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["all-products-for-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`id, name, price, sku, product_images(id, image_url, is_primary)`)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []).map((p: any) => ({ ...p, product_images: p.product_images || [] }));
    },
  });

  // Create campaign
  const createCampaignMutation = useMutation({
    mutationFn: async (form: CampaignForm) => {
      const { error } = await supabase.from("campaigns").insert({
        name: form.name,
        description: form.description || null,
        theme: form.theme,
        banner_image_url: form.banner_image_url || null,
        background_color: form.background_color,
        accent_color: form.accent_color,
        text_color: form.text_color,
        badge_text: form.badge_text,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active,
        display_order: campaigns.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setShowCreateForm(false);
      setCampaignForm(defaultCampaignForm);
      toast({ title: "Success", description: "Campaign created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update campaign
  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: CampaignForm }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: form.name,
          description: form.description || null,
          theme: form.theme,
          banner_image_url: form.banner_image_url || null,
          background_color: form.background_color,
          accent_color: form.accent_color,
          text_color: form.text_color,
          badge_text: form.badge_text,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          is_active: form.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setEditingCampaignId(null);
      toast({ title: "Success", description: "Campaign updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast({ title: "Success", description: "Campaign deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle campaign active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("campaigns").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
  });

  // Add product to campaign
  const addProductMutation = useMutation({
    mutationFn: async ({
      campaignId,
      productId,
      campaignPrice,
      discountPercentage,
    }: {
      campaignId: string;
      productId: string;
      campaignPrice: number | null;
      discountPercentage: number | null;
    }) => {
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      const { error } = await supabase.from("campaign_products").insert({
        campaign_id: campaignId,
        product_id: productId,
        campaign_price: campaignPrice,
        discount_percentage: discountPercentage,
        display_order: campaign?.campaign_products?.length || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setSelectedProductId("");
      setCampaignPrice("");
      setDiscountPercentage("");
      toast({ title: "Success", description: "Product added to campaign" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Remove product from campaign
  const removeProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast({ title: "Success", description: "Product removed from campaign" });
    },
  });

  // Reorder campaign products
  const reorderProductsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      for (const [index, item] of items.entries()) {
        const { error } = await supabase
          .from("campaign_products")
          .update({ display_order: index })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
  });

  // Reorder campaigns
  const reorderCampaignsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      for (const [index, item] of items.entries()) {
        const { error } = await supabase
          .from("campaigns")
          .update({ display_order: index })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
  });

  // Duplicate campaign
  const duplicateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      if (!campaign) throw new Error("Campaign not found");

      const { data: newCampaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: `${campaign.name} (Copy)`,
          description: campaign.description,
          theme: campaign.theme,
          banner_image_url: campaign.banner_image_url,
          background_color: campaign.background_color,
          accent_color: campaign.accent_color,
          text_color: campaign.text_color,
          badge_text: campaign.badge_text,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          is_active: false,
          display_order: campaigns.length,
        })
        .select("id")
        .single();

      if (campaignError) throw campaignError;

      if (campaign.campaign_products?.length > 0) {
        const productInserts = campaign.campaign_products.map((cp: any) => ({
          campaign_id: newCampaign.id,
          product_id: cp.products?.id,
          campaign_price: cp.campaign_price,
          discount_percentage: cp.discount_percentage,
          display_order: cp.display_order,
        }));
        const { error: productsError } = await supabase.from("campaign_products").insert(productInserts);
        if (productsError) throw productsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setDuplicateDialogId(null);
      toast({ title: "Success", description: "Campaign duplicated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCampaignDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(campaigns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderCampaignsMutation.mutate(items);
  };

  const handleProductDragEnd = (campaignId: string) => (result: any) => {
    if (!result.destination) return;
    const campaign = campaigns.find((c: any) => c.id === campaignId);
    if (!campaign) return;
    const items = Array.from(campaign.campaign_products);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderProductsMutation.mutate(items);
  };

  const startEditing = (campaign: any) => {
    setEditingCampaignId(campaign.id);
    setCampaignForm({
      name: campaign.name,
      description: campaign.description || "",
      theme: campaign.theme || "default",
      banner_image_url: campaign.banner_image_url || "",
      background_color: campaign.background_color || "#1a1a2e",
      accent_color: campaign.accent_color || "#e94560",
      text_color: campaign.text_color || "#ffffff",
      badge_text: campaign.badge_text || "CAMPAIGN",
      start_date: campaign.start_date ? campaign.start_date.slice(0, 16) : "",
      end_date: campaign.end_date ? campaign.end_date.slice(0, 16) : "",
      is_active: campaign.is_active,
    });
  };

  const getCampaignStatus = (campaign: any) => {
    if (!campaign.is_active) return { label: "Inactive", variant: "secondary" as const };
    const now = new Date();
    if (campaign.start_date && new Date(campaign.start_date) > now) return { label: "Scheduled", variant: "outline" as const };
    if (campaign.end_date && new Date(campaign.end_date) < now) return { label: "Ended", variant: "destructive" as const };
    return { label: "Live", variant: "default" as const };
  };

  const renderCampaignForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign Name *</Label>
          <Input
            id="campaign-name"
            value={campaignForm.name}
            onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Summer Sale 2026"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="badge-text">Badge Text</Label>
          <Input
            id="badge-text"
            value={campaignForm.badge_text}
            onChange={(e) => setCampaignForm((f) => ({ ...f, badge_text: e.target.value }))}
            placeholder="e.g. HOT DEAL, CLEARANCE"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-desc">Description</Label>
        <Textarea
          id="campaign-desc"
          value={campaignForm.description}
          onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Tell customers about this campaign..."
          className="min-h-[80px]"
        />
      </div>

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Campaign Timeline
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date (optional)</Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={campaignForm.start_date}
              onChange={(e) => setCampaignForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date (optional)</Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={campaignForm.end_date}
              onChange={(e) => setCampaignForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Theme / Colors */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4" /> Visual Theme
        </h4>

        {/* Presets */}
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            {themePresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105",
                  campaignForm.background_color === preset.bg
                    ? "ring-2 ring-primary ring-offset-2"
                    : "border-border"
                )}
                onClick={() =>
                  setCampaignForm((f) => ({
                    ...f,
                    background_color: preset.bg,
                    accent_color: preset.accent,
                    text_color: preset.text,
                  }))
                }
              >
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.bg }} />
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.accent }} />
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.text }} />
                </div>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bg-color">Background Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="bg-color"
                value={campaignForm.background_color}
                onChange={(e) => setCampaignForm((f) => ({ ...f, background_color: e.target.value }))}
                className="h-9 w-12 rounded cursor-pointer border"
              />
              <Input
                value={campaignForm.background_color}
                onChange={(e) => setCampaignForm((f) => ({ ...f, background_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="accent-color"
                value={campaignForm.accent_color}
                onChange={(e) => setCampaignForm((f) => ({ ...f, accent_color: e.target.value }))}
                className="h-9 w-12 rounded cursor-pointer border"
              />
              <Input
                value={campaignForm.accent_color}
                onChange={(e) => setCampaignForm((f) => ({ ...f, accent_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="text-color">Text Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="text-color"
                value={campaignForm.text_color}
                onChange={(e) => setCampaignForm((f) => ({ ...f, text_color: e.target.value }))}
                className="h-9 w-12 rounded cursor-pointer border"
              />
              <Input
                value={campaignForm.text_color}
                onChange={(e) => setCampaignForm((f) => ({ ...f, text_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
          <div
            className="rounded-xl p-6 text-center transition-colors duration-300"
            style={{
              backgroundColor: campaignForm.background_color,
              color: campaignForm.text_color,
            }}
          >
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white mb-2"
              style={{ backgroundColor: campaignForm.accent_color }}
            >
              <Flame className="h-3 w-3" />
              {campaignForm.badge_text || "CAMPAIGN"}
            </span>
            <h3 className="text-xl font-bold">{campaignForm.name || "Campaign Name"}</h3>
            <p className="text-sm opacity-70 mt-1">{campaignForm.description || "Campaign description goes here"}</p>
          </div>
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={campaignForm.is_active}
          onCheckedChange={(checked) => setCampaignForm((f) => ({ ...f, is_active: checked }))}
        />
        <Label>Campaign is active</Label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setShowCreateForm(false);
            setEditingCampaignId(null);
            setCampaignForm(defaultCampaignForm);
          }}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!campaignForm.name.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">
            Create and manage promotional campaigns with custom themes, timelines, and pricing
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        )}
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              New Campaign
            </CardTitle>
            <CardDescription>Set up a new promotional campaign</CardDescription>
          </CardHeader>
          <CardContent>
            {renderCampaignForm(
              () => createCampaignMutation.mutate(campaignForm),
              "Create Campaign"
            )}
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : campaigns.length === 0 && !showCreateForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Flame className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Create your first campaign to showcase curated products with custom themes, discounts, and countdown timers
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleCampaignDragEnd}>
          <Droppable droppableId="campaigns-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {campaigns.map((campaign: any, index: number) => {
                  const status = getCampaignStatus(campaign);
                  const isExpanded = expandedCampaign === campaign.id;
                  const isEditing = editingCampaignId === campaign.id;

                  return (
                    <Draggable key={campaign.id} draggableId={campaign.id} index={index}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="overflow-hidden"
                        >
                          {/* Campaign Header Row */}
                          <div className="flex items-center gap-3 p-4">
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Color preview swatch */}
                            <div
                              className="w-8 h-8 rounded-lg flex-shrink-0 border shadow-inner"
                              style={{ backgroundColor: campaign.background_color }}
                            >
                              <div
                                className="w-full h-full rounded-lg flex items-center justify-center"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: campaign.accent_color }}
                                />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold truncate">{campaign.name}</h3>
                                <Badge variant={status.variant}>{status.label}</Badge>
                                <Badge variant="outline" className="text-xs">
                                  {campaign.campaign_products?.length || 0} products
                                </Badge>
                              </div>
                              {campaign.description && (
                                <p className="text-sm text-muted-foreground truncate mt-0.5">
                                  {campaign.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Switch
                                checked={campaign.is_active}
                                onCheckedChange={(checked) =>
                                  toggleActiveMutation.mutate({ id: campaign.id, is_active: checked })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(campaign)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDuplicateDialogId(campaign.id)}
                                className="h-8 w-8"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setExpandedCampaign(isExpanded ? null : campaign.id)
                                }
                                className="h-8 w-8"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Edit Form */}
                          {isEditing && (
                            <div className="border-t px-4 py-6 bg-muted/30">
                              {renderCampaignForm(
                                () =>
                                  updateCampaignMutation.mutate({
                                    id: campaign.id,
                                    form: campaignForm,
                                  }),
                                "Save Changes"
                              )}
                            </div>
                          )}

                          {/* Expanded: Products Management */}
                          {isExpanded && !isEditing && (
                            <div className="border-t">
                              <div className="p-4 bg-muted/20">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  Campaign Products
                                </h4>

                                {/* Add Product */}
                                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                                  <Popover open={productSelectOpen} onOpenChange={setProductSelectOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="flex-1 justify-between"
                                        disabled={productsLoading}
                                      >
                                        {selectedProductId
                                          ? allProducts.find((p: any) => p.id === selectedProductId)?.name || "Select product"
                                          : "Select a product to add"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                      <div className="p-4 space-y-4">
                                        <Input
                                          placeholder="Search products..."
                                          value={productSearchTerm}
                                          onChange={(e) => setProductSearchTerm(e.target.value)}
                                        />
                                        <div className="max-h-64 overflow-auto space-y-1">
                                          {(() => {
                                            const existingIds = new Set(
                                              campaign.campaign_products?.map((cp: any) => cp.products?.id)
                                            );
                                            const available = allProducts.filter(
                                              (p: any) =>
                                                !existingIds.has(p.id) &&
                                                (productSearchTerm === "" ||
                                                  p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                                  p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                            );

                                            if (available.length === 0) {
                                              return (
                                                <div className="p-4 text-center text-muted-foreground text-sm">
                                                  {productSearchTerm ? "No products match" : "All products are already in this campaign"}
                                                </div>
                                              );
                                            }

                                            return available.map((product: any) => {
                                              const hasImages = product.product_images?.length > 0;
                                              const primaryImg = hasImages
                                                ? product.product_images.find((i: any) => i.is_primary) || product.product_images[0]
                                                : null;

                                              return (
                                                <div
                                                  key={product.id}
                                                  onClick={() => {
                                                    setSelectedProductId(product.id);
                                                    setProductSelectOpen(false);
                                                    setProductSearchTerm("");
                                                  }}
                                                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                                >
                                                  <Check
                                                    className={cn(
                                                      "h-4 w-4",
                                                      selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                  />
                                                  <div className="w-8 h-8 rounded bg-[hsl(var(--product-image-bg))] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {primaryImg ? (
                                                      <img src={primaryImg.image_url} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                      <ImageOff className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium truncate block">{product.name}</span>
                                                    <span className="text-xs text-muted-foreground">R{product.price}</span>
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      placeholder="Campaign Price"
                                      value={campaignPrice}
                                      onChange={(e) => setCampaignPrice(e.target.value)}
                                      className="w-32"
                                    />
                                    <Input
                                      type="number"
                                      placeholder="Discount %"
                                      value={discountPercentage}
                                      onChange={(e) => setDiscountPercentage(e.target.value)}
                                      className="w-28"
                                    />
                                    <Button
                                      onClick={() =>
                                        selectedProductId &&
                                        addProductMutation.mutate({
                                          campaignId: campaign.id,
                                          productId: selectedProductId,
                                          campaignPrice: campaignPrice ? parseFloat(campaignPrice) : null,
                                          discountPercentage: discountPercentage ? parseFloat(discountPercentage) : null,
                                        })
                                      }
                                      disabled={!selectedProductId || addProductMutation.isPending}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>

                                {/* Products List */}
                                <DragDropContext onDragEnd={handleProductDragEnd(campaign.id)}>
                                  <Droppable droppableId={`campaign-products-${campaign.id}`}>
                                    {(provided) => (
                                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                        {campaign.campaign_products?.length === 0 && (
                                          <p className="text-sm text-muted-foreground text-center py-6">
                                            No products added yet. Use the selector above to add products.
                                          </p>
                                        )}
                                        {campaign.campaign_products?.map((cp: any, idx: number) => (
                                          <Draggable key={cp.id} draggableId={cp.id} index={idx}>
                                            {(provided) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div {...provided.dragHandleProps}>
                                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                  </div>

                                                  {/* Product thumbnail */}
                                                  <div className="w-10 h-10 rounded bg-[hsl(var(--product-image-bg))] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                    {cp.products?.product_images?.length > 0 ? (
                                                      <img
                                                        src={
                                                          (cp.products.product_images.find((i: any) => i.is_primary) ||
                                                            cp.products.product_images[0])?.image_url
                                                        }
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                      />
                                                    ) : (
                                                      <ImageOff className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                  </div>

                                                  <div>
                                                    <span className="font-medium text-sm">{cp.products?.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-xs text-muted-foreground">
                                                        Original: R{cp.products?.price}
                                                      </span>
                                                      {cp.campaign_price != null && (
                                                        <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                                          Campaign: R{cp.campaign_price}
                                                        </Badge>
                                                      )}
                                                      {cp.discount_percentage != null && (
                                                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                                          -{cp.discount_percentage}%
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>

                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeProductMutation.mutate(cp.id)}
                                                  className="text-destructive hover:text-destructive"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </DragDropContext>
                              </div>
                            </div>
                          )}
                        </Card>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={!!duplicateDialogId} onOpenChange={() => setDuplicateDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Campaign</DialogTitle>
            <DialogDescription>
              This will create a copy of the campaign with all its products. The copy will be inactive by default.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => duplicateDialogId && duplicateCampaignMutation.mutate(duplicateDialogId)}
              disabled={duplicateCampaignMutation.isPending}
            >
              {duplicateCampaignMutation.isPending ? "Duplicating..." : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
