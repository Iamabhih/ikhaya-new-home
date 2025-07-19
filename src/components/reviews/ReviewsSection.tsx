
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";
import { ReviewForm } from "./ReviewForm";
import { ReviewsList } from "./ReviewsList";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ReviewsSectionProps {
  productId: string;
}

export const ReviewsSection = ({ productId }: ReviewsSectionProps) => {
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: reviewStats, refetch } = useQuery({
    queryKey: ['review-stats', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('average_rating, review_count')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: ratingDistribution } = useQuery({
    queryKey: ['rating-distribution', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true);
      
      if (error) throw error;
      
      const distribution = [0, 0, 0, 0, 0];
      data.forEach(review => {
        distribution[review.rating - 1]++;
      });
      
      return distribution;
    },
  });

  const handleReviewSubmitted = () => {
    refetch();
    setShowReviewForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Review Summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        
        {reviewStats && Number(reviewStats.review_count) > 0 ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <StarRating rating={reviewStats.average_rating || 0} readonly />
              <span className="text-lg font-semibold">
                {reviewStats.average_rating?.toFixed(1)} out of 5
              </span>
            </div>
            <span className="text-muted-foreground">
              Based on {reviewStats.review_count} review{reviewStats.review_count !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground">No reviews yet</p>
        )}

        {/* Rating Distribution */}
        {ratingDistribution && reviewStats && Number(reviewStats.review_count) > 0 && (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2 text-sm">
                <span className="w-12">{stars} star</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Number(reviewStats.review_count) > 0 ? (ratingDistribution[stars - 1] / reviewStats.review_count) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="w-8 text-right">{ratingDistribution[stars - 1]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Write Review Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <Button 
          onClick={() => setShowReviewForm(!showReviewForm)}
          variant={showReviewForm ? "outline" : "default"}
        >
          {showReviewForm ? "Cancel" : "Write a Review"}
        </Button>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <ReviewForm 
          productId={productId} 
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Reviews List */}
      <ReviewsList productId={productId} />
    </div>
  );
};
