import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { BannerImageUpload } from "../BannerImageUpload";
import { BannerPreview } from "./BannerPreview";

type PromotionalBanner = Tables<"promotional_banners">;

interface BannerFormData {
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  background_color: string;
  text_color: string;
  overlay_opacity: number;
  button_text: string;
  button_url: string;
  position: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  title_font_family: string;
  title_font_weight: string;
  subtitle_font_family: string;
  subtitle_font_weight: string;
  description_font_family: string;
  description_font_weight: string;
  text_shadow: string;
  title_shadow: string;
  content_shadow: string;
}

interface BannerFormProps {
  banner?: PromotionalBanner | null;
  onSave: (data: BannerFormData) => Promise<void>;
  onCancel: () => void;
}

const defaultFormData: BannerFormData = {
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
  end_date: "",
  title_font_family: "Inter",
  title_font_weight: "700",
  subtitle_font_family: "Inter",
  subtitle_font_weight: "500",
  description_font_family: "Inter",
  description_font_weight: "400",
  text_shadow: "none",
  title_shadow: "none",
  content_shadow: "none"
};

export const BannerForm = ({ banner, onSave, onCancel }: BannerFormProps) => {
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (banner) {
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
        end_date: banner.end_date ? banner.end_date.split('T')[0] : "",
        title_font_family: (banner as any).title_font_family || "Inter",
        title_font_weight: (banner as any).title_font_weight || "700",
        subtitle_font_family: (banner as any).subtitle_font_family || "Inter",
        subtitle_font_weight: (banner as any).subtitle_font_weight || "500",
        description_font_family: (banner as any).description_font_family || "Inter",
        description_font_weight: (banner as any).description_font_weight || "400",
        text_shadow: (banner as any).text_shadow || "none",
        title_shadow: (banner as any).title_shadow || "none",
        content_shadow: (banner as any).content_shadow || "none"
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [banner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Optional banner title"
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

          <BannerPreview formData={formData} className="mt-4" />
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Type className="h-5 w-5" />
              Typography & Effects
            </h3>

            {/* Title Typography */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-primary">Title Typography</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title_font_family">Font Family</Label>
                  <Select
                    value={formData.title_font_family}
                    onValueChange={(value) => setFormData({ ...formData, title_font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Oswald">Oswald</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Raleway">Raleway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title_font_weight">Font Weight</Label>
                  <Select
                    value={formData.title_font_weight}
                    onValueChange={(value) => setFormData({ ...formData, title_font_weight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="title_shadow">Title Shadow</Label>
                <Select
                  value={formData.title_shadow}
                  onValueChange={(value) => setFormData({ ...formData, title_shadow: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="2px 2px 4px rgba(0,0,0,0.3)">Soft Shadow</SelectItem>
                    <SelectItem value="4px 4px 8px rgba(0,0,0,0.5)">Medium Shadow</SelectItem>
                    <SelectItem value="6px 6px 12px rgba(0,0,0,0.7)">Strong Shadow</SelectItem>
                    <SelectItem value="0 0 10px rgba(255,255,255,0.5)">White Glow</SelectItem>
                    <SelectItem value="0 0 15px rgba(255,255,255,0.8)">Bright White Glow</SelectItem>
                    <SelectItem value="2px 2px 0px #000000">Retro Outline</SelectItem>
                    <SelectItem value="1px 1px 2px rgba(0,0,0,0.8)">Sharp Shadow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subtitle Typography */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-primary">Subtitle Typography</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subtitle_font_family">Font Family</Label>
                  <Select
                    value={formData.subtitle_font_family}
                    onValueChange={(value) => setFormData({ ...formData, subtitle_font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Oswald">Oswald</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Raleway">Raleway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subtitle_font_weight">Font Weight</Label>
                  <Select
                    value={formData.subtitle_font_weight}
                    onValueChange={(value) => setFormData({ ...formData, subtitle_font_weight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description Typography */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-primary">Description Typography</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description_font_family">Font Family</Label>
                  <Select
                    value={formData.description_font_family}
                    onValueChange={(value) => setFormData({ ...formData, description_font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Oswald">Oswald</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Raleway">Raleway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description_font_weight">Font Weight</Label>
                  <Select
                    value={formData.description_font_weight}
                    onValueChange={(value) => setFormData({ ...formData, description_font_weight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Overall Text Effects */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-primary">Text Effects</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="text_shadow">General Text Shadow</Label>
                  <Select
                    value={formData.text_shadow}
                    onValueChange={(value) => setFormData({ ...formData, text_shadow: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="1px 1px 2px rgba(0,0,0,0.3)">Subtle Shadow</SelectItem>
                      <SelectItem value="2px 2px 4px rgba(0,0,0,0.5)">Medium Shadow</SelectItem>
                      <SelectItem value="3px 3px 6px rgba(0,0,0,0.7)">Strong Shadow</SelectItem>
                      <SelectItem value="0 0 8px rgba(255,255,255,0.6)">White Glow</SelectItem>
                      <SelectItem value="0 0 12px rgba(255,255,255,0.9)">Strong White Glow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="content_shadow">Content Container Shadow</Label>
                  <Select
                    value={formData.content_shadow}
                    onValueChange={(value) => setFormData({ ...formData, content_shadow: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="0 4px 6px rgba(0,0,0,0.1)">Light Drop Shadow</SelectItem>
                      <SelectItem value="0 8px 15px rgba(0,0,0,0.2)">Medium Drop Shadow</SelectItem>
                      <SelectItem value="0 12px 25px rgba(0,0,0,0.3)">Strong Drop Shadow</SelectItem>
                      <SelectItem value="0 0 20px rgba(0,0,0,0.4)">Glow Shadow</SelectItem>
                      <SelectItem value="inset 0 0 20px rgba(0,0,0,0.2)">Inner Shadow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="p-4 rounded-lg border bg-muted/20">
              <h4 className="font-medium mb-3">Typography Preview</h4>
              <BannerPreview formData={formData} showTypography />
            </div>
          </div>
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : banner ? "Update" : "Create"} Banner
        </Button>
      </div>
    </form>
  );
};

export type { BannerFormData };
