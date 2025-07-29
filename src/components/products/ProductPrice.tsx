
interface ProductPriceProps {
  price: number;
  compareAtPrice?: number;
  viewMode: "grid" | "list";
}

export const ProductPrice = ({ price, compareAtPrice, viewMode }: ProductPriceProps) => {
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const discountPercentage = hasDiscount ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

  return (
    <div className={`flex items-center gap-3 ${viewMode === "grid" ? "mt-auto" : ""}`}>
      <span className={`font-bold text-primary ${viewMode === "list" ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} tracking-tight`}>
        R{price.toFixed(2)}
      </span>
      
      {hasDiscount && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-premium/60 line-through font-medium">
            R{compareAtPrice.toFixed(2)}
          </span>
          <span className="text-xs bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-2 py-1 rounded-full font-semibold shadow-soft">
            -{discountPercentage}%
          </span>
        </div>
      )}
    </div>
  );
};
