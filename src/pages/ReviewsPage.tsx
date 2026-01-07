import { useState, useEffect } from "react";
import { ArrowLeft, Star, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  business_id: string;
  establishment_id?: string; // Legacy field, use business_id
  rating: number | null;
  comment: string | null;
  status: string | null;
  created_at: string | null;
  establishment?: {
    name: string;
  };
  business?: {
    business_name: string;
  };
}

const ReviewsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (user) {
      fetchReviews();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          businesses:business_id (business_name)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((r: any) => ({
        ...r,
        establishment: r.businesses ? { name: r.businesses.business_name } : undefined,
        business: r.businesses,
      }));

      setReviews(transformedData);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedReview || rating === 0) {
      toast({
        title: t("common.error"),
        description: t("reviews.selectRating"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: comment || null,
          status: "completed",
        })
        .eq("id", selectedReview.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("reviews.thankYou"),
      });

      setSelectedReview(null);
      setRating(0);
      setComment("");
      fetchReviews();
    } catch (err) {
      console.error("Error submitting review:", err);
      toast({
        title: t("common.error"),
        description: t("reviews.submitError"),
        variant: "destructive",
      });
    }
  };

  const pendingReviews = reviews.filter((r) => r.status === "pending");
  const completedReviews = reviews.filter((r) => r.status === "completed");

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-foreground">{t("reviews.title")}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">{t("reviews.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Pending Reviews */}
        {pendingReviews.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t("reviews.pendingToRate")}
            </h2>
            <div className="space-y-3">
              {pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {review.establishment?.name || t("reviews.establishment")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.created_at || "").toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
                      {t("reviews.pending")}
                    </span>
                  </div>

                  {selectedReview?.id === review.id ? (
                    <div className="space-y-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                star <= rating
                                  ? "text-warning fill-warning"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder={t("reviews.shareFeedback")}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReview(null);
                            setRating(0);
                            setComment("");
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          variant="coral"
                          size="sm"
                          onClick={handleSubmitReview}
                        >
                          {t("reviews.submitReview")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="coral"
                      size="sm"
                      onClick={() => setSelectedReview(review)}
                    >
                      {t("reviews.rateNow")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Completed Reviews */}
        {completedReviews.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" />
              {t("reviews.completedReviews")}
            </h2>
            <div className="space-y-3">
              {completedReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-foreground">
                      {review.establishment?.name || t("reviews.establishment")}
                    </p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (review.rating || 0)
                              ? "text-warning fill-warning"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.created_at || "").toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {reviews.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-coral-light flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-coral" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("reviews.noReviews")}
            </h2>
            <p className="text-muted-foreground">
              {t("reviews.noReviewsDesc")}
            </p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ReviewsPage;