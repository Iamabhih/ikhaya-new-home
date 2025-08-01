-- Add font and shadow customization fields to promotional_banners table
ALTER TABLE promotional_banners 
ADD COLUMN title_font_family text DEFAULT 'Inter',
ADD COLUMN title_font_weight text DEFAULT '700',
ADD COLUMN subtitle_font_family text DEFAULT 'Inter',
ADD COLUMN subtitle_font_weight text DEFAULT '500',
ADD COLUMN description_font_family text DEFAULT 'Inter',
ADD COLUMN description_font_weight text DEFAULT '400',
ADD COLUMN text_shadow text DEFAULT 'none',
ADD COLUMN title_shadow text DEFAULT 'none',
ADD COLUMN content_shadow text DEFAULT 'none';