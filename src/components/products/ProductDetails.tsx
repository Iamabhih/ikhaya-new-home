import { Link } from "react-router-dom";
import { StarRating } from "@/components/reviews/StarRating";

interface ProductDetailsProps {
  product: {
    id: string;
    name: string;
    slug: string;
    short_description?: string;
    average_rating?: number;
    review_count?: number;
    stock_quantity?: number; // Added this to check if it's being displayed
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
    <div className={`${viewMode === "list" ? "space-y-2" : "space-y-2 flex-1 flex flex-col"}`}>
      <Link to={productUrl} className="group/title">
        <h3 className={`font-semibold text-base sm:text-lg text-premium group-hover:text-primary group/title-hover:text-primary transition-colors duration-300 ${viewMode === "list" ? "line-clamp-2" : "line-clamp-2 leading-tight"}`}>
          {product.name}
        </h3>
      </Link>
      
      {product.categories && (
        <p className="text-xs sm:text-sm text-premium/70 font-medium tracking-wide uppercase">
          {product.categories.name}
        </p>
      )}
      
      {/* Rating */}
      {product.average_rating && product.review_count && Number(product.review_count) > 0 && (
        <div className="flex items-center gap-2">
          <StarRating rating={product.average_rating} readonly size="sm" />
          <span className="text-xs text-premium/60 font-medium">
            ({product.review_count} reviews)
          </span>
        </div>
      )}
      
      {product.short_description && (
        <p className={`text-sm text-premium/80 leading-relaxed ${
          viewMode === "list" 
            ? "line-clamp-2 sm:line-clamp-3" 
            : "line-clamp-3 flex-1"
        }`}>
          {product.short_description}
        </p>
      )}
    </div>
  );
};