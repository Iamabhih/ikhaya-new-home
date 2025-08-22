import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { CartAbandonmentDashboard } from '@/components/admin/CartAbandonmentDashboard';

const AdminCartAbandonment = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cart Analytics</h1>
              <p className="text-gray-600 mt-1">Monitor cart abandonment and recover lost sales</p>
            </div>
          </div>
          
          <CartAbandonmentDashboard />
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminCartAbandonment;