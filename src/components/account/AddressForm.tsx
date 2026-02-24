import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export interface AddressFormData {
  label: string;
  first_name: string;
  last_name: string;
  company?: string;
  street_address: string;
  apartment?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

interface AddressFormProps {
  initialData?: AddressFormData;
  onSubmit: (data: AddressFormData) => void;
  loading?: boolean;
}

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

export const AddressForm = ({ initialData, onSubmit, loading }: AddressFormProps) => {
  const [formData, setFormData] = useState<AddressFormData>({
    label: initialData?.label || 'Home',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    company: initialData?.company || '',
    street_address: initialData?.street_address || '',
    apartment: initialData?.apartment || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    postal_code: initialData?.postal_code || '',
    country: initialData?.country || 'South Africa',
    phone: initialData?.phone || '',
    is_default_shipping: initialData?.is_default_shipping || false,
    is_default_billing: initialData?.is_default_billing || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Address Label</Label>
        <Select
          value={formData.label}
          onValueChange={(value) => setFormData(prev => ({ ...prev, label: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Home">Home</SelectItem>
            <SelectItem value="Work">Work</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company (Optional)</Label>
        <Input
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="street_address">Street Address *</Label>
        <Input
          id="street_address"
          name="street_address"
          value={formData.street_address}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apartment">Apartment, Suite, etc.</Label>
        <Input
          id="apartment"
          name="apartment"
          value={formData.apartment}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">Province *</Label>
          <Select
            value={formData.province}
            onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map(province => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code *</Label>
          <Input
            id="postal_code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_default_shipping"
            checked={formData.is_default_shipping}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, is_default_shipping: !!checked }))
            }
          />
          <Label htmlFor="is_default_shipping" className="text-sm font-normal">
            Set as default shipping address
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_default_billing"
            checked={formData.is_default_billing}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, is_default_billing: !!checked }))
            }
          />
          <Label htmlFor="is_default_billing" className="text-sm font-normal">
            Set as default billing address
          </Label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {initialData ? 'Update Address' : 'Add Address'}
      </Button>
    </form>
  );
};

export default AddressForm;
