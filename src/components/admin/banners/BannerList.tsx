import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Image, Calendar, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type PromotionalBanner = Tables<"promotional_banners">;

interface BannerListProps {
  banners: PromotionalBanner[];
  loading: boolean;
  onEdit: (banner: PromotionalBanner) => void;
  onDelete: (id: string) => void;
  onToggleActive: (banner: PromotionalBanner) => void;
  onMovePosition: (banner: PromotionalBanner, direction: "up" | "down") => void;
  onCreateNew: () => void;
}

export const BannerList = ({
  banners,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onMovePosition,
  onCreateNew
}: BannerListProps) => {
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading promotional banners...</span>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No promotional banners</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first promotional banner to start advertising sales and deals
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Banner
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
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
                    <h3 className="text-xl font-bold">{banner.title || "Untitled Banner"}</h3>
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
                    onClick={() => onMovePosition(banner, "up")}
                    disabled={banner.position === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMovePosition(banner, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleActive(banner)}
                  >
                    {banner.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(banner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(banner.id)}
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
    </div>
  );
};
