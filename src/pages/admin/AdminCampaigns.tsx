import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CampaignManagement } from "@/components/admin/CampaignManagement";

const AdminCampaigns = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <CampaignManagement />
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminCampaigns;
