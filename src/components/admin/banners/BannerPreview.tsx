import { Tables } from "@/integrations/supabase/types";

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

interface BannerPreviewProps {
  formData: BannerFormData;
  className?: string;
  showTypography?: boolean;
}

export const BannerPreview = ({ formData, className = "", showTypography = false }: BannerPreviewProps) => {
  return (
    <div className={`p-4 rounded-lg relative overflow-hidden ${className}`} style={{ backgroundColor: formData.background_color }}>
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
      <div
        className={`relative z-10 ${showTypography ? 'space-y-2' : ''}`}
        style={{
          color: formData.text_color,
          textShadow: formData.text_shadow !== 'none' ? formData.text_shadow : undefined,
          boxShadow: formData.content_shadow !== 'none' ? formData.content_shadow : undefined,
          padding: formData.content_shadow !== 'none' ? '1rem' : undefined,
          borderRadius: formData.content_shadow !== 'none' ? '0.5rem' : undefined
        }}
      >
        <h1
          className={showTypography ? "text-2xl" : "font-bold text-lg"}
          style={{
            fontFamily: formData.title_font_family,
            fontWeight: formData.title_font_weight,
            textShadow: formData.title_shadow !== 'none' ? formData.title_shadow : undefined
          }}
        >
          {formData.title || "Preview Title"}
        </h1>
        {formData.subtitle && (
          <p
            className={showTypography ? "text-lg opacity-90" : "text-sm opacity-90"}
            style={{
              fontFamily: formData.subtitle_font_family,
              fontWeight: formData.subtitle_font_weight
            }}
          >
            {formData.subtitle}
          </p>
        )}
        {formData.description && (
          <p
            className={showTypography ? "text-sm opacity-80" : "text-xs mt-1"}
            style={{
              fontFamily: formData.description_font_family,
              fontWeight: formData.description_font_weight
            }}
          >
            {formData.description}
          </p>
        )}
      </div>
    </div>
  );
};

export type { BannerFormData };
