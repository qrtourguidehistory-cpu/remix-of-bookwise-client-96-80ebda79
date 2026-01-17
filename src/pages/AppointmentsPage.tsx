import { useState } from "react";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useAppointments } from "@/hooks/useAppointments";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { CancelAppointmentDialog } from "@/components/appointments/CancelAppointmentDialog";
import { DeleteAppointmentDialog } from "@/components/appointments/DeleteAppointmentDialog";
import { Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es, enUS, fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useTimeFormat } from "@/hooks/useTimeFormat";

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { formatTime } = useTimeFormat();
  const {
    upcomingAppointments,
    pastAppointments,
    loading,
    historyFull, // Estado de historial lleno
    cancelAppointment,
    deleteAppointment,
  } = useAppointments();

  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const getLocale = () => {
    switch (i18n.language) {
      case "en": return enUS;
      case "fr": return fr;
      default: return es;
    }
  };

  const handleViewDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };

  const handleCancelClick = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (appointmentToCancel) {
      await cancelAppointment(appointmentToCancel);
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
    }
  };

  const handleDeleteClick = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (appointmentToDelete) {
      await deleteAppointment(appointmentToDelete);
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };

  const handleRebook = (appointment: any) => {
    if (appointment.establishment?.id) {
      navigate(`/business/${appointment.establishment.id}`);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "d MMM yyyy", { locale: getLocale() });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="px-4 py-4 max-w-lg mx-auto">
            <h1 className="text-xl font-bold text-foreground">{t("appointments.title")}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">{t("appointments.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Banner de Historial Lleno */}
        {historyFull && pastAppointments.length >= 15 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800">
                  Su almacén de historial de citas está lleno
                </h3>
                <p className="text-xs text-yellow-700 mt-1">
                  Has alcanzado el límite de 15 citas en el historial. Por favor, elimina citas antiguas para mantener un historial organizado. Las citas completadas más antiguas se eliminarán automáticamente al hacer nuevas reservas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming */}
        <section className="animate-fade-in">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {t("appointments.upcoming")}
          </h2>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {apt.establishment?.name || "Establecimiento"}
                      </h3>
                      {apt.staff?.full_name && (
                        <p className="text-sm text-muted-foreground">
                          con {apt.staff.full_name}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      apt.status === "pending"
                        ? "bg-warning/10 text-warning"
                        : apt.status === "confirmed"
                        ? "bg-success/10 text-success"
                        : apt.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : apt.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {apt.status === "pending"
                        ? t("appointments.pending") || "Pendiente"
                        : apt.status === "confirmed"
                        ? t("appointments.confirmed")
                        : apt.status === "completed"
                        ? t("appointments.completed")
                        : apt.status === "cancelled"
                        ? t("appointments.cancelled")
                        : t("appointments.pending") || "Pendiente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(apt.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {apt.start_time ? formatTime(apt.start_time) : "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        RD$ {((apt as any).price_rd || apt.price || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        USD ${((apt as any).price_usd || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelClick(apt.id)}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        variant="coral"
                        size="sm"
                        onClick={() => handleViewDetails(apt)}
                      >
                        {t("appointments.viewDetails")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("appointments.noUpcoming")}</p>
              <Link to="/search">
                <Button variant="coral" className="mt-4">
                  {t("appointments.bookNew")}
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Past */}
        {pastAppointments.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("appointments.history")}
            </h2>
            <div className="space-y-4">
              {pastAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-card rounded-2xl border border-border p-5 opacity-75"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {apt.establishment?.name || "Establecimiento"}
                      </h3>
                      {apt.staff?.full_name && (
                        <p className="text-sm text-muted-foreground">
                          con {apt.staff.full_name}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      apt.status === "pending"
                        ? "bg-warning/10 text-warning"
                        : apt.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : apt.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : apt.status === "confirmed"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {apt.status === "pending"
                        ? t("appointments.pending") || "Pendiente"
                        : apt.status === "cancelled"
                        ? t("appointments.cancelled")
                        : apt.status === "completed"
                        ? t("appointments.completed")
                        : apt.status === "confirmed"
                        ? t("appointments.confirmed")
                        : t("appointments.pending") || "Pendiente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(apt.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {apt.start_time ? formatTime(apt.start_time) : "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        RD$ {((apt as any).price_rd || apt.price || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        USD ${((apt as any).price_usd || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(apt.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="coral-outline"
                        size="sm"
                        onClick={() => handleRebook(apt)}
                      >
                        {t("appointments.rebookAppointment")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNavigation />

      {/* Dialogs */}
      <AppointmentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        appointment={selectedAppointment}
        onCancel={handleCancelClick}
        onRebook={handleRebook}
      />

      <CancelAppointmentDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        appointmentName={
          upcomingAppointments.find((a) => a.id === appointmentToCancel)
            ?.establishment?.name
        }
      />

      <DeleteAppointmentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        appointmentName={
          pastAppointments.find((a) => a.id === appointmentToDelete)
            ?.establishment?.name
        }
      />
    </div>
  );
};

export default AppointmentsPage;
