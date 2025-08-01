
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  CheckCircle, 
  Settings, 
  X,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSettings {
  lowStockThreshold: number;
  emailNotifications: boolean;
  importAlerts: boolean;
  performanceAlerts: boolean;
}

interface Alert {
  id: string;
  type: 'low_stock' | 'import_complete' | 'performance' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    lowStockThreshold: 5,
    emailNotifications: true,
    importAlerts: true,
    performanceAlerts: false
  });
  const queryClient = useQueryClient();

  // Mock alerts - in real app, these would come from a notifications table
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: '12 products are running low on inventory',
      priority: 'high',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      type: 'import_complete',
      title: 'Import Completed',
      message: 'Product import finished: 45 products added successfully',
      priority: 'medium',
      isRead: false,
      createdAt: new Date(Date.now() - 30000).toISOString()
    },
    {
      id: '3',
      type: 'performance',
      title: 'Performance Alert',
      message: 'Top performing product "Premium Laptop" stock is critically low',
      priority: 'high',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  // Get low stock count for real-time alerts - optimized polling
  const { data: lowStockCount } = useQuery({
    queryKey: ['low-stock-count', settings.lowStockThreshold],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('stock_quantity', settings.lowStockThreshold);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 300000, // Reduced from 30s to 5 minutes to reduce database load
    staleTime: 240000, // Cache for 4 minutes
  });

  // Update low stock alert when count changes
  useEffect(() => {
    if (lowStockCount && lowStockCount > 0) {
      const existingAlert = alerts.find(a => a.type === 'low_stock' && !a.isRead);
      if (!existingAlert) {
        const newAlert: Alert = {
          id: crypto.randomUUID(),
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${lowStockCount} products are running low on inventory`,
          priority: lowStockCount > 10 ? 'high' : 'medium',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        setAlerts(prev => [newAlert, ...prev.filter(a => a.type !== 'low_stock' || a.isRead)]);
      }
    }
  }, [lowStockCount]);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, isRead: true } : a
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const saveSettings = () => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
    toast.success('Notification settings saved');
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'low_stock':
        return <Package className="h-4 w-4" />;
      case 'import_complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'performance':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="w-96 max-h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  alert.isRead ? 'bg-muted/50' : 'bg-background hover:bg-muted/50'
                }`}
                onClick={() => !alert.isRead && markAsRead(alert.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${!alert.isRead ? 'font-semibold' : ''}`}>
                          {alert.title}
                        </h4>
                        <Badge variant={getPriorityColor(alert.priority)} className="text-xs">
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Email notifications</label>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm">Import alerts</label>
              <Switch
                checked={settings.importAlerts}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, importAlerts: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm">Performance alerts</label>
              <Switch
                checked={settings.performanceAlerts}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, performanceAlerts: checked }))
                }
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm">Low stock threshold</label>
              <Input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, lowStockThreshold: Number(e.target.value) }))
                }
                className="h-8"
                min="0"
              />
            </div>
            
            <Button onClick={saveSettings} size="sm" className="w-full">
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
