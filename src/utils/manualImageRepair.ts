import { supabase } from "@/integrations/supabase/client";

export const runManualImageRepair = async () => {
  console.log("🔧 Starting manual image repair scan...");
  
  try {
    // Call the repair missing image links function
    const { data, error } = await supabase.functions.invoke('repair-missing-image-links', {
      body: { 
        mode: 'manual_scan',
        force_rescan: true 
      }
    });

    if (error) {
      console.error("❌ Repair function error:", error);
      throw error;
    }

    console.log("✅ Manual repair completed:", data);
    return data;
  } catch (error) {
    console.error("❌ Manual image repair failed:", error);
    throw error;
  }
};