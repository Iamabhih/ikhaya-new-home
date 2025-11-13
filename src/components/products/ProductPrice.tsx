
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface ProductPriceProps {
  price: number;
  compareAtPrice?: number;
  viewMode: "grid" | "list";
}

export const ProductPrice = ({ price, compareAtPrice, viewMode }: ProductPriceProps) => {
  const { settings } = useSiteSettings();
  const hidePricing = settings?.hide_pricing === true;
  const hasDiscount = compareAtPrice && compareAtPrice > price;

  if (hidePricing) {
    return (
      <div className={`flex items-center gap-1.5 ${viewMode === "grid" ? "mt-auto" : ""}`}>
        <span className="text-sm font-medium text-muted-foreground">
          Request Quote
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${viewMode === "grid" ? "mt-auto" : ""}`}>
      <span className="text-sm font-bold gradient-text-brand">
        R{price.toFixed(2)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-xs text-premium-muted line-through opacity-60">
            R{compareAtPrice.toFixed(2)}
          </span>
          <span className="text-xs bg-destructive text-destructive-foreground px-1 py-0.5 rounded-full font-medium">
            SALE
          </span>
        </>
      )}
    </div>
  );
};
