import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp } from "lucide-react";

interface ReviewsListProps {
  productId: string;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_verified_purchase: boolean;
  is_featured: boolean;
  helpful_count: number;
  admin_response: string | null;
  created_at: string;
  user_id: string | null;
}

export const ReviewsList = ({ productId }: ReviewsListProps) => {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          id,
          rating,
          title,
          content,
          is_verified_purchase,
          is_featured,
          helpful_count,
          admin_response,
          created_at,
          user_id
        `)
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No reviews yet. Be the first to review this product!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className={review.is_featured ? 'border-primary/50 bg-primary/5' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} readonly size="sm" />
                  {review.is_verified_purchase && (
                    <Badge variant="secondary" className="text-xs">
                      Verified Purchase
                    </Badge>
                  )}
                  {review.is_featured && (
                    <Badge className="text-xs">Featured</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </p>
              </div>
              {review.helpful_count > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{review.helpful_count}</span>
                </div>
              )}
            </div>
            
            {review.title && (
              <h4 className="font-semibold mb-2">{review.title}</h4>
            )}
            
            {review.content && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {review.content}
              </p>
            )}

            {review.admin_response && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-primary mb-1">Store Response</p>
                <p className="text-sm text-muted-foreground">{review.admin_response}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
