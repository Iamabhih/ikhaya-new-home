export const getSupabaseImageUrl = (imagePath: string): string => {
  if (!imagePath) return '/placeholder.svg';
  
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Convert relative path to full Supabase storage URL
  const supabaseUrl = 'https://kauostzhxqoxggwqgtym.supabase.co';
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
};