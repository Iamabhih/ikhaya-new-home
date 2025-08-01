
interface ProductPriceProps {
  price: number;
  compareAtPrice?: number;
  viewMode: "grid" | "list";
}

export const ProductPrice = ({ price, compareAtPrice, viewMode }: ProductPriceProps) => {
  const hasDiscount = compareAtPrice && compareAtPrice > price;

  return (
    <div className={`flex items-center gap-1 xs:gap-2 ${viewMode === "grid" ? "mt-auto" : ""}`}>
      <span className="text-sm xs:text-base sm:text-lg font-bold text-foreground">
        R{price.toFixed(2)}
      </span>
      {hasDiscount && (
        <span className="text-xs xs:text-xs sm:text-sm text-muted-foreground line-through">
          R{compareAtPrice.toFixed(2)}
        </span>
      )}
    </div>
  );
};
