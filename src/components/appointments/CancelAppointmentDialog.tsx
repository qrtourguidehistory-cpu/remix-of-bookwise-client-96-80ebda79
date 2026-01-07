import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  appointmentName?: string;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  onConfirm,
  appointmentName,
}: CancelAppointmentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de cancelar tu cita
            {appointmentName && ` en ${appointmentName}`}. Esta acción no se puede deshacer.
            <br />
            <br />
            <span className="text-warning font-medium">
              Recuerda: Las cancelaciones deben realizarse con al menos 24 horas de anticipación.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sí, cancelar cita
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
