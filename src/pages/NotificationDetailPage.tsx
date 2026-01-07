import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Tag, Star, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useNotifications, type NotificationType } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const iconMap: Record<NotificationType, typeof Calendar> = {
  appointment: Calendar,
  promotion: Tag,
  review: Star,
  system: Settings,
};

const NotificationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notifications, markAsRead, loading, error } = useNotifications();
  
  const notification = id ? notifications.find((n) => n.id === id) : undefined;
  
  // Review form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  // Fetch business info from appointment when notification is review type
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      console.log("NotificationDetailPage - Checking notification:", {
        type: notification?.type,
        appointment_id: notification?.appointment_id,
        hasUser: !!user,
        notification: notification
      });

      // Check for review type (including review_request mapped to review)
      if ((notification?.type === "review" || notification?.meta?.type === "review_request") && notification.appointment_id && user) {
        console.log("NotificationDetailPage - Fetching business info for review notification");
        setLoadingBusiness(true);
        try {
          // Get appointment and business info
          const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .select(`
              business_id,
              businesses:business_id (id, business_name)
            `)
            .eq("id", notification.appointment_id)
            .single();

          console.log("NotificationDetailPage - Appointment data:", appointment, "Error:", appointmentError);

          if (appointmentError) throw appointmentError;

          if (appointment?.business_id) {
            console.log("NotificationDetailPage - Setting business info:", {
              business_id: appointment.business_id,
              business_name: (appointment.businesses as any)?.business_name
            });
            setBusinessId(appointment.business_id);
            setBusinessName((appointment.businesses as any)?.business_name || null);

            // Check if review already exists for this appointment (get the most recent completed one first)
            const { data: existingReviews, error: reviewCheckError } = await supabase
              .from("reviews")
              .select("id, status, rating, comment")
              .eq("appointment_id", notification.appointment_id)
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false });

            console.log("NotificationDetailPage - Existing reviews check:", {
              existingReviews,
              error: reviewCheckError,
              appointment_id: notification.appointment_id,
              user_id: user.id
            });

            // Find the most recent completed review, or the most recent one in general
            const completedReview = existingReviews?.find(r => r.status === "completed");
            const existingReview = completedReview || existingReviews?.[0];

            if (existingReview) {
              setReviewId(existingReview.id);
              if (existingReview.status === "completed") {
                console.log("NotificationDetailPage - Review already completed, showing read-only view");
                setRating(existingReview.rating || 0);
                setComment(existingReview.comment || "");
                setReviewCompleted(true); // Mark as already completed - THIS IS KEY
                setLoadingBusiness(false); // Make sure loading is stopped
                return; // Exit early if review is already completed
              } else {
                // Review exists but not completed, allow editing
                if (existingReview.rating) setRating(existingReview.rating);
                if (existingReview.comment) setComment(existingReview.comment);
                setReviewCompleted(false); // Ensure it's not marked as completed
              }
            } else {
              // Create pending review if it doesn't exist
              console.log("NotificationDetailPage - Creating new review");
              const { data: newReview, error: reviewError } = await supabase
                .from("reviews")
              .insert({
                  business_id: appointment.business_id, // Only use business_id (establishment_id doesn't exist)
                  user_id: user.id,
                  appointment_id: notification.appointment_id || null,
                  status: "pending",
                })
                .select()
                .single();

              console.log("NotificationDetailPage - New review created:", newReview, "Error:", reviewError);

              if (!reviewError && newReview) {
                setReviewId(newReview.id);
              }
            }
          } else {
            console.log("NotificationDetailPage - No business_id found in appointment");
          }
        } catch (err) {
          console.error("NotificationDetailPage - Error fetching business info:", err);
        } finally {
          setLoadingBusiness(false);
        }
      } else {
        console.log("NotificationDetailPage - Conditions not met:", {
          isReview: notification?.type === "review",
          hasAppointmentId: !!notification?.appointment_id,
          hasUser: !!user
        });
      }
    };

    fetchBusinessInfo();
  }, [notification, user]);

  // Mark as read when viewing
  useEffect(() => {
    if (notification && !notification.read) {
      markAsRead(notification.id);
    }
  }, [notification, markAsRead]);

  const handleSubmitReview = async () => {
    console.log("handleSubmitReview - Starting with:", { reviewCompleted, reviewId, rating, comment });
    
    if (reviewCompleted) {
      toast({
        title: t("common.error"),
        description: "Ya has completado esta reseña",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: t("common.error"),
        description: t("reviews.selectRating") || "Por favor selecciona una calificación",
        variant: "destructive",
      });
      return;
    }
    
    if (!reviewId) {
      console.error("No reviewId available - creating new review");
      // Try to create review if it doesn't exist
      if (!businessId || !user) {
        toast({
          title: t("common.error"),
          description: "No se pudo identificar el establecimiento",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const { data: newReview, error: createError } = await supabase
          .from("reviews")
          .insert({
            business_id: businessId, // Only use business_id (establishment_id doesn't exist)
            user_id: user.id,
            appointment_id: notification?.appointment_id || null,
            rating,
            comment: comment || null,
            status: "completed",
            notification_sent: true,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        console.log("Review created directly:", newReview);
        setReviewCompleted(true);
        
        toast({
          title: t("common.success"),
          description: t("reviews.thankYou"),
        });
        
        setTimeout(() => navigate("/"), 1500);
        return;
      } catch (err) {
        console.error("Error creating review:", err);
        toast({
          title: t("common.error"),
          description: "No se pudo enviar la reseña",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Update review status to completed
      // The database trigger will automatically create a notification for the business owner
      const { error: updateError } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: comment || null,
          status: "completed",
          notification_sent: true,
        })
        .eq("id", reviewId);

      if (updateError) throw updateError;

      // Mark as completed to prevent resubmission
      setReviewCompleted(true);

      console.log("Review submitted successfully, trigger should create notification for business owner");

      toast({
        title: t("common.success"),
        description: t("reviews.thankYou"),
      });

      // Navigate back after a short delay
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      console.error("Error submitting review:", err);
      toast({
        title: t("common.error"),
        description: t("reviews.submitError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Error al cargar notificaciones</p>
          <Link to="/">
            <Button variant="coral">{t("common.back")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("common.loading") || "Cargando..."}</p>
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Notificación no encontrada</p>
          <Link to="/">
            <Button variant="coral">{t("common.back")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Asegurar que el tipo existe en iconMap, usar 'system' como fallback
  const notificationType = notification.type in iconMap ? notification.type : 'system';
  const Icon = iconMap[notificationType];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          <h1 className="flex-1 text-center font-semibold text-foreground">
            {t("notifications.title")}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-start gap-4 mb-6">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                notification.type === "appointment"
                  ? "bg-info/10 text-info"
                  : notification.type === "promotion"
                  ? "bg-coral-light text-coral"
                  : notification.type === "review"
                  ? "bg-warning/10 text-warning"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {notification.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {notification.time}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <p className="text-foreground leading-relaxed">
              {notification.message}
            </p>
          </div>

          {notification.type === "appointment" && notification.appointment_id && (
            <div className="mt-6 pt-6 border-t border-border">
              <Link to="/appointments">
                <Button variant="coral" className="w-full">
                  {t("appointments.viewDetails")}
                </Button>
              </Link>
            </div>
          )}

          {notification.type === "review" && (
            <div className="mt-6 pt-6 border-t border-border space-y-4">
              {loadingBusiness ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">{t("common.loading") || "Cargando..."}</p>
                </div>
              ) : businessId ? (
                <>
                  {businessName && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">{t("reviews.establishment")}</p>
                      <p className="font-medium text-foreground">{businessName}</p>
                    </div>
                  )}
                  {(() => {
                    console.log("Review form render - reviewCompleted:", reviewCompleted, "reviewId:", reviewId, "rating:", rating);
                    return null;
                  })()}
                  {reviewCompleted ? (
                    <div className="space-y-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                        <Star className="w-12 h-12 text-warning fill-warning mx-auto mb-2" />
                        <p className="font-semibold text-foreground mb-1">
                          {t("reviews.reviewSubmitted") || "¡Reseña enviada!"}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Ya has enviado tu reseña para este establecimiento.
                        </p>
                        {rating > 0 && (
                          <div className="flex gap-1 justify-center mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-6 h-6 ${
                                  star <= rating
                                    ? "text-warning fill-warning"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        {comment && (
                          <div className="mt-3 text-left">
                            <p className="text-sm font-medium text-foreground mb-1">Tu comentario:</p>
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
                              {comment}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate("/")}
                      >
                        {t("common.back")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-3">
                          {t("reviews.yourExperience") || "¿Cómo fue tu experiencia?"}
                        </p>
                        <div className="flex gap-2 justify-center mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className="p-1 transition-transform hover:scale-110"
                              disabled={isSubmitting}
                            >
                              <Star
                                className={`w-10 h-10 ${
                                  star <= rating
                                    ? "text-warning fill-warning"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Textarea
                          placeholder={t("reviews.shareFeedback")}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          maxLength={500}
                          disabled={isSubmitting}
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {comment.length}/500
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate("/")}
                          disabled={isSubmitting}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          variant="coral"
                          className="flex-1"
                          onClick={handleSubmitReview}
                          disabled={isSubmitting || rating === 0}
                        >
                          {isSubmitting ? t("common.loading") || "Enviando..." : t("reviews.submitReview")}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No se pudo cargar la información del establecimiento
                  </p>
              <Link to="/reviews">
                <Button variant="coral" className="w-full">
                  {t("reviews.rateNow")}
                </Button>
              </Link>
                </div>
              )}
            </div>
          )}

          {notification.type === "promotion" && (
            <div className="mt-6 pt-6 border-t border-border">
              <Link to="/search">
                <Button variant="coral" className="w-full">
                  {t("favorites.explorePlaces")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationDetailPage;
