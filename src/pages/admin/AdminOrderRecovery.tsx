import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { ManualOrderCreator } from '@/components/admin/ManualOrderCreator';

export default function AdminOrderRecovery() {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Recovery</h1>
            <p className="text-muted-foreground">
              Handle missing orders from payment confirmations
            </p>
          </div>
          
          <ManualOrderCreator />
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}