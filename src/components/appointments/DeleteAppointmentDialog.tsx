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

interface DeleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  appointmentName?: string;
}

export function DeleteAppointmentDialog({
  open,
  onOpenChange,
  onConfirm,
  appointmentName,
}: DeleteAppointmentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta cita del historial?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar permanentemente esta cita
            {appointmentName && ` de ${appointmentName}`} de tu historial.
            <br />
            <br />
            <span className="text-destructive font-medium">
              Esta acción no se puede deshacer. La cita será eliminada permanentemente.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

