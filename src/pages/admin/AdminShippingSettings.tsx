import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Truck, Settings, MapPin, Package, TestTube, Check, AlertCircle } from 'lucide-react';
import { useShippingSettings, CollectionAddress, DefaultParcel, ServiceLevels } from '@/hooks/useShippingSettings';

const AdminShippingSettings = () => {
  const { settings, isLoading, updateSettings, testConnection } = useShippingSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Local state for forms
  const [collectionAddress, setCollectionAddress] = useState<CollectionAddress>({
    company: '',
    street_address: '',
    local_area: '',
    city: '',
    zone: '',
    country: 'ZA',
    code: '',
    contact_name: '',
    phone: '',
    email: '',
  });

  const [defaultParcel, setDefaultParcel] = useState<DefaultParcel>({
    weight: 1,
    length: 20,
    width: 15,
    height: 10,
  });

  const [serviceLevels, setServiceLevels] = useState<ServiceLevels>({
    economy: true,
    express: true,
    overnight: true,
  });

  const [markupPercentage, setMarkupPercentage] = useState(0);
  const [isTestMode, setIsTestMode] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setCollectionAddress(settings.collection_address || collectionAddress);
      setDefaultParcel(settings.default_parcel || defaultParcel);
      setServiceLevels(settings.service_levels || serviceLevels);
      setMarkupPercentage(settings.markup_percentage || 0);
      setIsTestMode(settings.is_test_mode ?? true);
      setIsEnabled(settings.is_enabled ?? false);
    }
  });

  const handleSaveApiSettings = async () => {
    await updateSettings.mutateAsync({
      is_enabled: isEnabled,
      is_test_mode: isTestMode,
      markup_percentage: markupPercentage,
    });
  };

  const handleSaveCollectionAddress = async () => {
    await updateSettings.mutateAsync({
      collection_address: collectionAddress as any,
    });
  };

  const handleSaveParcelDefaults = async () => {
    await updateSettings.mutateAsync({
      default_parcel: defaultParcel as any,
    });
  };

  const handleSaveServiceLevels = async () => {
    await updateSettings.mutateAsync({
      service_levels: serviceLevels as any,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Truck className="h-8 w-8 text-primary" />
                Shipping Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure ShipLogic (CourierGuy) integration for live shipping rates
              </p>
            </div>
            <Badge variant={settings?.is_enabled ? 'default' : 'secondary'} className="text-sm">
              {settings?.is_enabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <Tabs defaultValue="api" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                API Config
              </TabsTrigger>
              <TabsTrigger value="collection" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Collection Address
              </TabsTrigger>
              <TabsTrigger value="parcels" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Parcel Defaults
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Services
              </TabsTrigger>
            </TabsList>

            {/* API Configuration */}
            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Configure your ShipLogic API connection and test mode settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable ShipLogic Integration</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, live shipping rates will be fetched from ShipLogic
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={setIsEnabled}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Test Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Use sandbox environment for testing (no real shipments created)
                      </p>
                    </div>
                    <Switch
                      checked={isTestMode}
                      onCheckedChange={setIsTestMode}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="markup">Price Markup (%)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="markup"
                        type="number"
                        min="0"
                        max="100"
                        value={markupPercentage}
                        onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                        className="w-32"
                      />
                      <p className="text-sm text-muted-foreground">
                        Add a percentage markup to shipping rates
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => testConnection.mutate()}
                      variant="outline"
                      disabled={testConnection.isPending}
                    >
                      {testConnection.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button 
                      onClick={handleSaveApiSettings}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Settings
                    </Button>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">API Key Required</p>
                      <p className="mt-1">
                        Make sure to add your ShipLogic API key as a secret in your Supabase Edge Functions settings.
                        The secret should be named <code className="bg-amber-100 px-1 rounded">SHIPLOGIC_API_KEY</code>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Collection Address */}
            <TabsContent value="collection">
              <Card>
                <CardHeader>
                  <CardTitle>Collection Address</CardTitle>
                  <CardDescription>
                    Your warehouse or business address where parcels are collected from
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        value={collectionAddress.company || ''}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, company: e.target.value })}
                        placeholder="Your Company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_name">Contact Name *</Label>
                      <Input
                        id="contact_name"
                        value={collectionAddress.contact_name || ''}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, contact_name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street_address">Street Address *</Label>
                    <Input
                      id="street_address"
                      value={collectionAddress.street_address}
                      onChange={(e) => setCollectionAddress({ ...collectionAddress, street_address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="local_area">Suburb / Local Area</Label>
                    <Input
                      id="local_area"
                      value={collectionAddress.local_area || ''}
                      onChange={(e) => setCollectionAddress({ ...collectionAddress, local_area: e.target.value })}
                      placeholder="Sandton"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={collectionAddress.city}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, city: e.target.value })}
                        placeholder="Johannesburg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone">Province *</Label>
                      <Input
                        id="zone"
                        value={collectionAddress.zone}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, zone: e.target.value })}
                        placeholder="Gauteng"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Postal Code *</Label>
                      <Input
                        id="code"
                        value={collectionAddress.code}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, code: e.target.value })}
                        placeholder="2196"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={collectionAddress.country}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, country: e.target.value })}
                        placeholder="ZA"
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={collectionAddress.phone || ''}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, phone: e.target.value })}
                        placeholder="+27 12 345 6789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={collectionAddress.email || ''}
                        onChange={(e) => setCollectionAddress({ ...collectionAddress, email: e.target.value })}
                        placeholder="shipping@yourcompany.com"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveCollectionAddress}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Collection Address
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Parcel Defaults */}
            <TabsContent value="parcels">
              <Card>
                <CardHeader>
                  <CardTitle>Default Parcel Settings</CardTitle>
                  <CardDescription>
                    Default dimensions and weight used when calculating shipping rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={defaultParcel.weight}
                        onChange={(e) => setDefaultParcel({ ...defaultParcel, weight: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="length">Length (cm)</Label>
                      <Input
                        id="length"
                        type="number"
                        min="1"
                        value={defaultParcel.length}
                        onChange={(e) => setDefaultParcel({ ...defaultParcel, length: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        min="1"
                        value={defaultParcel.width}
                        onChange={(e) => setDefaultParcel({ ...defaultParcel, width: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        min="1"
                        value={defaultParcel.height}
                        onChange={(e) => setDefaultParcel({ ...defaultParcel, height: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveParcelDefaults}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Parcel Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Service Levels */}
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Service Levels</CardTitle>
                  <CardDescription>
                    Enable or disable specific shipping service levels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Economy Shipping</Label>
                      <p className="text-sm text-muted-foreground">
                        Budget-friendly option with longer delivery times
                      </p>
                    </div>
                    <Switch
                      checked={serviceLevels.economy}
                      onCheckedChange={(checked) => setServiceLevels({ ...serviceLevels, economy: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Express Shipping</Label>
                      <p className="text-sm text-muted-foreground">
                        Fast delivery within 2-3 business days
                      </p>
                    </div>
                    <Switch
                      checked={serviceLevels.express}
                      onCheckedChange={(checked) => setServiceLevels({ ...serviceLevels, express: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Overnight Shipping</Label>
                      <p className="text-sm text-muted-foreground">
                        Next-day delivery for urgent orders
                      </p>
                    </div>
                    <Switch
                      checked={serviceLevels.overnight}
                      onCheckedChange={(checked) => setServiceLevels({ ...serviceLevels, overnight: checked })}
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveServiceLevels}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Service Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminShippingSettings;
