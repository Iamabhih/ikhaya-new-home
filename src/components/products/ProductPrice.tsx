
interface ProductPriceProps {
  price: number;
  compareAtPrice?: number;
  viewMode: "grid" | "list";
}

export const ProductPrice = ({ price, compareAtPrice, viewMode }: ProductPriceProps) => {
  const hasDiscount = compareAtPrice && compareAtPrice > price;

  return (
    <div className={`flex items-center gap-2 ${viewMode === "grid" ? "mt-auto" : ""}`}>
      <span className="text-sm xs:text-base sm:text-lg font-bold gradient-text-brand">
        R{price.toFixed(2)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-xs xs:text-xs sm:text-sm text-premium-muted line-through opacity-60">
            R{compareAtPrice.toFixed(2)}
          </span>
          <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-medium">
            SALE
          </span>
        </>
      )}
    </div>
  );
};
