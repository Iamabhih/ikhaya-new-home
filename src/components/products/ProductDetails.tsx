import { Link } from "react-router-dom";
import { StarRating } from "@/components/reviews/StarRating";

interface ProductDetailsProps {
  product: {
    id: string;
    name: string;
    slug: string;
    sku?: string;
    short_description?: string;
    average_rating?: number;
    review_count?: number;
    stock_quantity?: number;
    categories?: {
      id: string;
      name: string;
      slug: string;
    };
  };
  viewMode: "grid" | "list";
}

export const ProductDetails = ({ product, viewMode }: ProductDetailsProps) => {
  const productUrl = `/products/${product.slug}`;

  return (
    <div className={`${viewMode === "list" ? "space-y-0.5 sm:space-y-1" : "space-y-1 flex-1 flex flex-col"}`}>
      <Link to={productUrl} className="group/title">
        <h3 className={`font-bold text-base text-center bg-gradient-to-r from-primary/15 via-primary-glow/10 to-secondary/15 rounded-lg px-3 py-2 text-primary group-hover/title:scale-[1.02] group-hover/title:shadow-glow group-hover/title:from-primary/25 group-hover/title:via-primary-glow/20 group-hover/title:to-secondary/25 transition-all duration-300 ${viewMode === "list" ? "line-clamp-2" : "mb-1 line-clamp-2"}`}>
          {product.name}
        </h3>
      </Link>
      
      {product.categories && (
        <p className="text-xs font-bold text-secondary hover:text-secondary-glow mb-0.5 sm:mb-1 uppercase tracking-widest transition-colors duration-300 drop-shadow-sm text-center">
          {product.categories.name}
        </p>
      )}
      
      {/* SKU */}
      {product.sku && (
        <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
          <span className="text-xs text-premium-muted font-mono bg-primary/5 px-1.5 py-0.5 rounded-full">
            SKU: {product.sku}
          </span>
        </div>
      )}
      
      {product.short_description && (
        <p className={`text-xs text-premium leading-relaxed ${
          viewMode === "list" 
            ? "line-clamp-1 sm:line-clamp-2 hidden sm:block" 
            : "mb-1 line-clamp-2 flex-1"
        }`}>
          {product.short_description}
        </p>
      )}
    </div>
  );
};