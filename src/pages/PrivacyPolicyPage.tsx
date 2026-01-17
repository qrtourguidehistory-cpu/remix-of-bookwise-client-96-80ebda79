import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">Política de Privacidad</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">Última actualización: Enero 2026</p>

          <h2 className="text-lg font-bold text-foreground mt-6">1. Información que Recopilamos</h2>
          <p className="text-foreground">
            Mí Turnow ("nosotros", "nuestro" o "la Aplicación") recopila información personal limitada necesaria para proporcionar nuestros servicios de reserva de citas. Esta incluye:
          </p>
          <ul className="list-disc ml-6 text-foreground space-y-1">
            <li>Nombre y datos de contacto (teléfono, email)</li>
            <li>Información de cuenta y preferencias</li>
            <li>Historial de reservas y servicios utilizados</li>
            <li>Datos de ubicación (solo cuando uses la función de mapa)</li>
            <li>Información del dispositivo y datos de uso de la aplicación</li>
          </ul>

          <h2 className="text-lg font-bold text-foreground mt-6">2. Uso de la Información</h2>
          <p className="text-foreground">
            Utilizamos tu información únicamente para:
          </p>
          <ul className="list-disc ml-6 text-foreground space-y-1">
            <li>Gestionar tus reservas y comunicarte con los establecimientos</li>
            <li>Enviar notificaciones sobre tus citas</li>
            <li>Mejorar nuestros servicios</li>
            <li>Cumplir con obligaciones legales</li>
          </ul>

          <h2 className="text-lg font-bold text-foreground mt-6">3. Compartir Información</h2>
          <p className="text-foreground">
            NO vendemos tu información personal. Solo la compartimos con:
          </p>
          <ul className="list-disc ml-6 text-foreground space-y-1">
            <li>Los establecimientos donde reserves citas (nombre y contacto)</li>
            <li>Proveedores de servicios técnicos necesarios para operar la app</li>
            <li>Autoridades cuando sea requerido por ley</li>
          </ul>

          <h2 className="text-lg font-bold text-foreground mt-6">4. Seguridad de Datos</h2>
          <p className="text-foreground">
            Implementamos medidas de seguridad técnicas y organizativas para proteger tu información. Sin embargo, ningún sistema es 100% seguro y no podemos garantizar seguridad absoluta.
          </p>

          <h2 className="text-lg font-bold text-foreground mt-6">5. Tus Derechos</h2>
          <p className="text-foreground">Tienes derecho a:</p>
          <ul className="list-disc ml-6 text-foreground space-y-1">
            <li>Acceder a tu información personal</li>
            <li>Corregir datos incorrectos</li>
            <li>Solicitar la eliminación de tu cuenta</li>
            <li>Retirar consentimientos</li>
            <li>Exportar tus datos</li>
          </ul>

          <h2 className="text-lg font-bold text-foreground mt-6">6. Cookies y Tecnologías Similares</h2>
          <p className="text-foreground">
            Usamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso de la app y personalizar contenido.
          </p>

          <h2 className="text-lg font-bold text-foreground mt-6">7. Menores de Edad</h2>
          <p className="text-foreground">
            Nuestros servicios están destinados a personas mayores de 18 años. No recopilamos intencionalmente información de menores.
          </p>

          <h2 className="text-lg font-bold text-foreground mt-6">8. Cambios a esta Política</h2>
          <p className="text-foreground">
            Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios importantes a través de la app o por email.
          </p>

          <h2 className="text-lg font-bold text-foreground mt-6">9. Contacto</h2>
          <p className="text-foreground">
            Para preguntas sobre privacidad, contáctanos:
          </p>
          <p className="text-foreground ml-4">
            <strong>Email:</strong> soporte@miturnow.com<br />
            <strong>Teléfono:</strong> +1 809-219-5141<br />
            <strong>Horario:</strong> Lunes a Viernes, 9:00 AM - 6:00 PM (Hora del Este)
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
