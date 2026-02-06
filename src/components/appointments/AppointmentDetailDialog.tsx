import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, User, DollarSign, Scissors, Mail, FileText, X, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { useTranslation } from "react-i18next";
import { generateReceiptPDF } from "@/utils/generateReceiptPDF";
import { toast } from "@/hooks/use-toast";

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
    clients?: {
      first_name: string | null;
      last_name: string | null;
      full_name: string | null;
      email: string | null;
    } | null;
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

  // Función para generar recibo PDF
  const handleGenerateReceipt = () => {
    try {
      // Calcular totales
      const totalPriceRD = appointment.services?.reduce((sum, service) => {
        return sum + (service.price_rd || service.price || 0);
      }, 0) || appointment.price_rd || appointment.price || 0;

      const totalPriceUSD = appointment.services?.reduce((sum, service) => {
        return sum + (service.price_usd || 0);
      }, 0) || appointment.price_usd || 0;

      generateReceiptPDF({
        businessName: appointment.establishment?.name || 'Establecimiento',
        clientName: appointment.client_name,
        date: appointment.date,
        startTime: appointment.start_time,
        services: appointment.services || [],
        totalPriceRD: Number(totalPriceRD),
        totalPriceUSD: Number(totalPriceUSD),
        appointmentId: appointment.id,
      });

      toast({
        title: "Recibo generado",
        description: "El recibo PDF se ha descargado correctamente",
      });
    } catch (error) {
      console.error('[AppointmentDetailDialog] Error al generar recibo:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el recibo. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const isPast = appointment.date && new Date(appointment.date) < new Date();
  const isCancelled = appointment.status === "cancelled";
  const isCompleted = appointment.status === "completed";

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
          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            {t("appointments.confirmed") || "Confirmada"}
          </span>
        );
      case "cancelled":
        return (
          <span className="px-4 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-200">
            {t("appointments.cancelled") || "Cancelada"}
          </span>
        );
      case "completed":
        return (
          <span className="px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
            {t("appointments.completed") || "Completada"}
          </span>
        );
      case "pending":
      default:
        return (
          <span className="px-4 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
            {t("appointments.pending") || "Pendiente"}
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-slate-50 [&>button]:hidden">
        {/* Header Premium */}
        <div 
          className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shadow-sm" 
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 1.25rem))' }}
        >
          <DialogHeader className="flex-1">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Detalles de la Cita
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5 text-slate-600" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {/* Tarjeta: Información del Establecimiento */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-slate-600" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Establecimiento
                </p>
                <p className="text-base font-bold text-slate-900 mb-1">
                  {appointment.establishment?.name || "N/A"}
                </p>
                {appointment.establishment?.address && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {appointment.establishment.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tarjeta: Fecha y Hora */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-slate-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Fecha y Hora
                </p>
                <p className="text-base font-bold text-slate-900 mb-2">
                  {appointment.date
                    ? format(parseISO(appointment.date), "EEEE, d 'de' MMMM yyyy", {
                        locale: es,
                      })
                    : "N/A"}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4 text-slate-400" strokeWidth={2} />
                  <span>
                    {appointment.start_time ? formatTime(appointment.start_time) : "N/A"}
                    {appointment.end_time && ` - ${formatTime(appointment.end_time)}`}
                    {appointment.duration_minutes && ` • ${appointment.duration_minutes} min`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta: Servicios */}
          {appointment.services && appointment.services.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Scissors className="w-6 h-6 text-slate-600" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Servicios
                  </p>
                </div>
              </div>
              <div className="space-y-3 ml-16">
                {appointment.services.map((service) => {
                  const priceRD = service.price_rd !== undefined && service.price_rd !== null 
                    ? Number(service.price_rd) 
                    : (service.price || 0);
                  const priceUSD = service.price_usd !== undefined && service.price_usd !== null 
                    ? Number(service.price_usd) 
                    : 0;
                  const duration = service.duration_minutes || 0;
                  
                  return (
                    <div key={service.id} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 mb-1">
                          {service.name || "Servicio"}
                        </p>
                        <p className="text-xs text-slate-500">{duration} min</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">
                          RD$ {priceRD.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          USD ${priceUSD.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tarjeta: Profesional */}
          {appointment.staff?.full_name && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-600" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Profesional
                  </p>
                  <p className="text-base font-bold text-slate-900">
                    {appointment.staff.full_name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tarjeta: Información del Cliente */}
          {(appointment.client_name || appointment.clients) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              {/* A nombre de */}
              {appointment.client_name && (
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-slate-600" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        A nombre de
                      </p>
                      <p className="text-base font-bold text-slate-900 mb-2">
                        {appointment.client_name}
                      </p>
                      {appointment.client_phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                          <Phone className="w-4 h-4 text-slate-400" strokeWidth={2} />
                          <span>{appointment.client_phone}</span>
                        </div>
                      )}
                      {appointment.client_email && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Mail className="w-4 h-4 text-slate-400" strokeWidth={2} />
                          <span>{appointment.client_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reservado por */}
              {appointment.clients && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-slate-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Reservado por
                    </p>
                    <p className="text-base font-bold text-slate-900">
                      {appointment.clients.first_name && appointment.clients.last_name
                        ? `${appointment.clients.first_name} ${appointment.clients.last_name}`.trim()
                        : appointment.clients.full_name || 
                          appointment.clients.email ||
                          'Usuario'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tarjeta: Precio Total */}
          {appointment.price && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-slate-600" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Precio Total
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    RD$ {(appointment.price_rd || appointment.price || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">
                    USD ${(appointment.price_usd || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tarjeta: Notas */}
          {appointment.notes && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Notas
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Tarjeta: Política de Cancelación */}
          {!isPast && !isCancelled && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
              <p className="text-sm font-bold text-amber-900 mb-1.5">Política de Cancelación</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Las cancelaciones deben realizarse con al menos 24 horas de anticipación.
                La política de reembolso varía según el establecimiento.
              </p>
            </div>
          )}
        </div>

        {/* Footer Premium con acciones */}
        <div 
          className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-4 flex flex-col gap-3 shadow-lg" 
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          {/* Botón de Recibo PDF - Solo si la cita está completada */}
          {isCompleted && (
            <Button
              variant="outline"
              className="w-full rounded-full h-11 font-semibold border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-all"
              onClick={handleGenerateReceipt}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generar Recibo PDF
            </Button>
          )}
          
          <div className="flex gap-3">
            {!isPast && !isCancelled && onCancel && (
              <Button
                variant="outline"
                className="flex-1 rounded-full h-11 font-semibold text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 transition-all"
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
                className="flex-1 rounded-full h-11 font-semibold hover:opacity-90 active:opacity-80 transition-all"
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
              className={`${!isPast && !isCancelled && onCancel ? "" : "flex-1"} rounded-full h-11 font-semibold hover:bg-slate-100 active:bg-slate-200 transition-all`}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
