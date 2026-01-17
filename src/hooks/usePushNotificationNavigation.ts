import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook que escucha eventos de navegación desde notificaciones push
 * y navega a la ruta correspondiente cuando se recibe el evento.
 */
export const usePushNotificationNavigation = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handlePushNotificationNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ path: string; appointmentId?: string }>;
      const { path, appointmentId } = customEvent.detail;

      console.log('[PushNavigation] Navegando desde notificación push:', { path, appointmentId });

      if (path) {
        // Navegar a la ruta especificada
        navigate(path, { replace: false });
        
        // Si hay un appointmentId y estamos en la página de appointments,
        // podríamos abrir el diálogo de detalles (esto requeriría más lógica)
        if (appointmentId && path === '/appointments') {
          // Por ahora solo navegamos a la lista
          // En el futuro se podría pasar el appointmentId como query param
          // y que AppointmentsPage lo detecte y abra el diálogo automáticamente
          console.log('[PushNavigation] Appointment ID recibido:', appointmentId);
        }
      }
    };

    // Escuchar el evento personalizado
    window.addEventListener('pushNotificationNavigate', handlePushNotificationNavigate);

    return () => {
      window.removeEventListener('pushNotificationNavigate', handlePushNotificationNavigate);
    };
  }, [navigate]);
};

