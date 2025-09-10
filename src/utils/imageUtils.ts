import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a relative Supabase storage path to a full public URL
 */
export const getSupabaseImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Handle relative paths from product-images bucket
  if (imagePath.startsWith('product-images/')) {
    const fileName = imagePath.replace('product-images/', '');
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    return data.publicUrl;
  }
  
  // Handle relative paths from site-images bucket
  if (imagePath.startsWith('site-images/')) {
    const fileName = imagePath.replace('site-images/', '');
    const { data } = supabase.storage
      .from('site-images')
      .getPublicUrl(fileName);
    return data.publicUrl;
  }
  
  // Default to product-images bucket if no prefix
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(imagePath);
  return data.publicUrl;
};