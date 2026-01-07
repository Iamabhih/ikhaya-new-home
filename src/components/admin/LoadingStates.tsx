import { UniversalLoading } from "@/components/ui/universal-loading";
import { getLoadingConfig } from "@/utils/loadingUtils";

export const AdminTableLoading = () => (
  <UniversalLoading 
    variant="list" 
    count={8} 
    className="space-y-2"
  />
);

export const AdminDashboardLoading = () => (
  <div className="space-y-6">
    <UniversalLoading variant="page" />
  </div>
);

export const ProductManagementLoading = () => {
  const config = getLoadingConfig('products');
  return (
    <UniversalLoading 
      variant={config.variant}
      count={config.count}
      className={config.className}
    />
  );
};

export const CategoryManagementLoading = () => {
  const config = getLoadingConfig('categories');
  return (
    <UniversalLoading 
      variant={config.variant}
      count={config.count}
      className={config.className}
    />
  );
};

export const SearchResultsLoading = () => {
  const config = getLoadingConfig('search');
  return (
    <UniversalLoading 
      variant={config.variant}
      count={config.count}
      className={config.className}
    />
  );
};

export const GeneralLoading = ({ text }: { text?: string }) => {
  const config = getLoadingConfig('general');
  return (
    <UniversalLoading 
      variant={config.variant}
      text={text}
      className={config.className}
    />
  );
};