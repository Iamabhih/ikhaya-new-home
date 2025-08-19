import { useSiteSettings } from "@/hooks/useSiteSettings";
import { AlertTriangle } from "lucide-react";

export const MaintenanceBanner = () => {
  const { settings, isLoading } = useSiteSettings();

  if (isLoading || !settings?.maintenance_banner_enabled) {
    return null;
  }

  const bannerText = settings?.maintenance_banner_text || "Site is currently under maintenance";

  return (
    <div className="bg-orange-600 text-white py-4 px-4 text-center relative z-[60] w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-medium">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <span className="leading-relaxed">{bannerText}</span>
      </div>
    </div>
  );
};