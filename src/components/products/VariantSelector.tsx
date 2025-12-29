import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  is_active: boolean;
  parent_product_id: string;
}

interface VariantSelectorProps {
  productId: string;
  onVariantSelect: (variant: ProductVariant | null) => void;
  selectedVariantId?: string;
}

export const VariantSelector = ({ productId, onVariantSelect, selectedVariantId }: VariantSelectorProps) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('parent_product_id', productId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (selectedVariantId) {
      setSelectedVariant(selectedVariantId);
    }
  }, [selectedVariantId]);

  useEffect(() => {
    const variant = variants.find(v => v.id === selectedVariant);
    onVariantSelect(variant || null);
  }, [selectedVariant, variants, onVariantSelect]);

  if (isLoading) {
    return <div className="h-10 bg-muted animate-pulse rounded" />;
  }

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Select Option</Label>
      <Select value={selectedVariant} onValueChange={setSelectedVariant}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => (
            <SelectItem 
              key={variant.id} 
              value={variant.id}
              disabled={variant.stock_quantity <= 0}
            >
              <span className="flex items-center gap-2">
                {variant.sku} - R{variant.price.toFixed(2)}
                {variant.stock_quantity <= 0 && (
                  <Badge variant="outline" className="text-xs">Out of stock</Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VariantSelector;
