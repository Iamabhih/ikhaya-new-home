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
    <div className={`${viewMode === "list" ? "space-y-1 sm:space-y-2" : "space-y-1 sm:space-y-2 flex-1 flex flex-col"}`}>
      <Link to={productUrl}>
        <h3 className={`font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors ${viewMode === "list" ? "line-clamp-2" : "mb-1 sm:mb-2 line-clamp-2"}`}>
          {product.name}
        </h3>
      </Link>
      
      {product.categories && (
        <p className="text-xs text-muted-foreground mb-1 sm:mb-2">
          {product.categories.name}
        </p>
      )}
      
      {/* SKU */}
      {product.sku && (
        <div className="flex items-center gap-1 mb-1 sm:mb-2">
          <span className="text-xs text-muted-foreground">
            SKU: {product.sku}
          </span>
        </div>
      )}
      
      {product.short_description && (
        <p className={`text-xs sm:text-sm text-muted-foreground ${
          viewMode === "list" 
            ? "line-clamp-2 sm:line-clamp-3 hidden sm:block" 
            : "mb-2 sm:mb-3 line-clamp-2 flex-1"
        }`}>
          {product.short_description}
        </p>
      )}
    </div>
  );
};