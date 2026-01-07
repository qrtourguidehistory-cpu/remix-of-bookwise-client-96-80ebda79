import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, User, DollarSign, Scissors, Mail } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { useTranslation } from "react-i18next";

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    establishment?: {
      name: string;
      address: string | null;
    };
    staff?: {
      full_name: string | null;
    };
    services?: Array<{
      id: string;
      name: string;
      price: number;
      price_rd: number;
      price_usd: number;
      duration_minutes: number;
      currency?: string;
    }>;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
    price: number | null;
    price_currency?: string | null;
    price_rd?: number | null;
    price_usd?: number | null;
    notes: string | null;
    client_name: string | null;
    client_phone: string | null;
    client_email: string | null;
    duration_minutes: number | null;
  } | null;
  onCancel?: (id: string) => void;
  onRebook?: (appointment: any) => void;
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  onCancel,
  onRebook,
}: AppointmentDetailDialogProps) {
  const { formatTime } = useTimeFormat();
  const { t } = useTranslation();
  
  if (!appointment) return null;

  const isPast = appointment.date && new Date(appointment.date) < new Date();
  const isCancelled = appointment.status === "cancelled";

  // Determine currency - use appointment currency or default from first service
  const getCurrency = () => {
    if (appointment.price_currency) return appointment.price_currency;
    if (appointment.services && appointment.services.length > 0) {
      return appointment.services[0].currency || "RD$";
    }
    return "RD$";
  };
  const currency = getCurrency();

  const getStatusBadge = () => {
    switch (appointment.status) {
      case "confirmed":
        return (
          <span className="px-3 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
            {t("appointments.confirmed") || "Confirmada"}
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full">
            {t("appointments.cancelled") || "Cancelada"}
          </span>
        );
      case "completed":
        return (
          <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
            {t("appointments.completed") || "Completada"}
          </span>
        );
      case "pending":
      default:
        return (
          <span className="px-3 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
            {t("appointments.pending") || "Pendiente"}
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles de la Cita</span>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Establishment */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-gray-700" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Establecimiento</p>
              <p className="font-medium text-foreground">
                {appointment.establishment?.name || "N/A"}
              </p>
              {appointment.establishment?.address && (
                <p className="text-sm text-muted-foreground">
                  {appointment.establishment.address}
                </p>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-gray-700" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha y Hora</p>
              <p className="font-medium text-foreground">
                {appointment.date
                  ? format(parseISO(appointment.date), "EEEE, d 'de' MMMM yyyy", {
                      locale: es,
                    })
                  : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-600" strokeWidth={2} />
                {appointment.start_time ? formatTime(appointment.start_time) : "N/A"}
                {appointment.end_time && ` - ${formatTime(appointment.end_time)}`}
                {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
              </p>
            </div>
          </div>

          {/* Services */}
          {appointment.services && appointment.services.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5 text-gray-700" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Servicios</p>
                <div className="space-y-1">
                  {appointment.services.map((service) => {
                    // Ensure price_rd and price_usd are numbers, with fallback to 0
                    const priceRD = service.price_rd !== undefined && service.price_rd !== null 
                      ? Number(service.price_rd) 
                      : (service.price || 0);
                    const priceUSD = service.price_usd !== undefined && service.price_usd !== null 
                      ? Number(service.price_usd) 
                      : 0;
                    const duration = service.duration_minutes || 0;
                    
                    return (
                      <div key={service.id} className="flex items-center justify-between">
                        <p className="font-medium text-foreground">{service.name || "Servicio"}</p>
                        <div className="text-sm text-muted-foreground text-right">
                          <p>{duration} min</p>
                          <p className="font-medium text-foreground">
                            RD$ {priceRD.toLocaleString()} / USD ${priceUSD.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Staff */}
          {appointment.staff?.full_name && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-700" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profesional</p>
                <p className="font-medium text-foreground">
                  {appointment.staff.full_name}
                </p>
              </div>
            </div>
          )}

          {/* Client Information */}
          {appointment.client_name && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-700" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A nombre de</p>
                <p className="font-medium text-foreground">
                  {appointment.client_name}
                </p>
                {appointment.client_phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-gray-600" strokeWidth={2} />
                    {appointment.client_phone}
                  </p>
                )}
                {appointment.client_email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3 text-gray-600" strokeWidth={2} />
                    {appointment.client_email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Price */}
          {appointment.price && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-gray-700" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio Total</p>
                <div className="font-medium text-foreground">
                  <p>RD$ {(appointment.price_rd || appointment.price || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">USD ${(appointment.price_usd || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Notas</p>
              <p className="text-sm text-foreground">{appointment.notes}</p>
            </div>
          )}

          {/* Cancellation Policy */}
          {!isPast && !isCancelled && (
            <div className="bg-warning/10 rounded-lg p-3">
              <p className="text-sm text-warning font-medium">Política de Cancelación</p>
              <p className="text-xs text-muted-foreground mt-1">
                Las cancelaciones deben realizarse con al menos 24 horas de anticipación.
                La política de reembolso varía según el establecimiento.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {!isPast && !isCancelled && onCancel && (
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => {
                onCancel(appointment.id);
                onOpenChange(false);
              }}
            >
              Cancelar Cita
            </Button>
          )}
          {(isPast || isCancelled) && onRebook && (
            <Button
              variant="coral"
              className="flex-1"
              onClick={() => {
                onRebook(appointment);
                onOpenChange(false);
              }}
            >
              Reservar de nuevo
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className={!isPast && !isCancelled ? "" : "flex-1"}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
