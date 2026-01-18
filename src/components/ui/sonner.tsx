import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// Función base toast() con ID único
const toastBase = (message: string, data?: Parameters<typeof sonnerToast>[1]) => {
  const id = data?.id || `notificacion-base-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return sonnerToast(message, { ...data, id });
};

// Crear funciones wrapper con IDs únicos por defecto para evitar duplicados
const toast = Object.assign(toastBase, {
  ...sonnerToast,
  success: (message: string, data?: Parameters<typeof sonnerToast.success>[1]) => {
    const id = data?.id || `notificacion-success-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return sonnerToast.success(message, { ...data, id });
  },
  error: (message: string, data?: Parameters<typeof sonnerToast.error>[1]) => {
    const id = data?.id || `notificacion-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return sonnerToast.error(message, { ...data, id });
  },
  info: (message: string, data?: Parameters<typeof sonnerToast.info>[1]) => {
    const id = data?.id || `notificacion-info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return sonnerToast.info(message, { ...data, id });
  },
  warning: (message: string, data?: Parameters<typeof sonnerToast.warning>[1]) => {
    const id = data?.id || `notificacion-warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return sonnerToast.warning(message, { ...data, id });
  },
}) as typeof sonnerToast & typeof toastBase;

export { Toaster, toast };
