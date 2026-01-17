import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Términos y Condiciones</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="text-sm text-muted-foreground">
          Última actualización: Enero 2026
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">1. Aceptación de Términos</h2>
          <p className="text-muted-foreground">
            Al acceder y usar Mí Turnow ("la Aplicación"), aceptas estar legalmente vinculado por estos Términos y Condiciones. Si no estás de acuerdo, no uses la Aplicación.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">2. Descripción del Servicio</h2>
          <p className="text-muted-foreground">
            Mí Turnow es una plataforma de intermediación que conecta usuarios con establecimientos de servicios personales (barberías, salones de belleza, spas, etc.). NO SOMOS responsables de los servicios prestados por los establecimientos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">3. LIMITACIÓN DE RESPONSABILIDAD</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-foreground font-semibold">IMPORTANTE - LEE CUIDADOSAMENTE:</p>
            <p className="text-foreground mt-2">
              Mí Turnow actúa ÚNICAMENTE como intermediario tecnológico. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY:
            </p>
            <ul className="list-disc ml-6 text-foreground space-y-1 mt-2">
              <li>NO somos responsables de la calidad, seguridad o legalidad de los servicios prestados por los establecimientos</li>
              <li>NO garantizamos la disponibilidad, exactitud o confiabilidad de la información de los establecimientos</li>
              <li>NO somos responsables por daños físicos, emocionales, económicos o de cualquier tipo resultantes de servicios recibidos</li>
              <li>NO respondemos por cancelaciones, cambios de horario o incumplimientos por parte de los establecimientos</li>
              <li>NO somos responsables por pérdida de datos, interrupciones del servicio o errores técnicos</li>
              <li>Cualquier disputa con un establecimiento es directamente entre tú y el establecimiento</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">4. USO DE LA APLICACIÓN "TAL CUAL"</h2>
          <p className="text-muted-foreground">
            LA APLICACIÓN SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD" SIN GARANTÍAS DE NINGÚN TIPO, expresas o implícitas, incluyendo pero no limitado a garantías de comerciabilidad, idoneidad para un propósito particular o no infracción.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">5. Responsabilidades del Usuario</h2>
          <p className="text-muted-foreground">Al usar Mí Turnow, te comprometes a:</p>
          <ul className="list-disc ml-6 text-muted-foreground space-y-1">
            <li>Proporcionar información veraz y actualizada</li>
            <li>Mantener la seguridad de tu cuenta</li>
            <li>Respetar las políticas de cancelación de los establecimientos</li>
            <li>Pagar directamente al establecimiento por los servicios recibidos</li>
            <li>No usar la app para actividades ilegales o fraudulentas</li>
            <li>Verificar directamente con el establecimiento antes de acudir a tu cita</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">6. INDEMNIZACIÓN</h2>
          <p className="text-muted-foreground">
            Aceptas INDEMNIZAR, DEFENDER y MANTENER INDEMNE a Mí Turnow, sus propietarios, directores, empleados y afiliados de cualquier reclamo, demanda, daño, pérdida, responsabilidad, costo o gasto (incluyendo honorarios legales) que surja de:
          </p>
          <ul className="list-disc ml-6 text-muted-foreground space-y-1">
            <li>Tu uso de la Aplicación</li>
            <li>Tu violación de estos Términos</li>
            <li>Tu interacción con cualquier establecimiento</li>
            <li>Servicios recibidos a través de la plataforma</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">7. Reservas y Cancelaciones</h2>
          <p className="text-muted-foreground">
            Las políticas de cancelación son establecidas por cada establecimiento independientemente. Mí Turnow NO es responsable de políticas de cancelación, cargos por no presentarse o disputas relacionadas con reservas.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">8. Pagos</h2>
          <p className="text-muted-foreground">
            Los pagos por servicios se realizan DIRECTAMENTE con el establecimiento. Mí Turnow NO procesa, maneja ni es responsable de transacciones de pago entre usuarios y establecimientos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">9. Propiedad Intelectual</h2>
          <p className="text-muted-foreground">
            Todos los derechos de propiedad intelectual de la Aplicación pertenecen a Mí Turnow. No puedes copiar, modificar, distribuir o crear obras derivadas sin autorización expresa.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">10. Suspensión y Terminación</h2>
          <p className="text-muted-foreground">
            Nos reservamos el derecho de suspender o terminar tu acceso a la Aplicación en cualquier momento, sin previo aviso, por cualquier motivo, incluyendo violación de estos Términos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">11. RENUNCIA A DEMANDAS COLECTIVAS</h2>
          <p className="text-muted-foreground">
            Aceptas que cualquier disputa se resolverá de manera individual. RENUNCIAS A TU DERECHO de participar en demandas colectivas o acciones de clase contra Mí Turnow.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">12. Jurisdicción y Ley Aplicable</h2>
          <p className="text-muted-foreground">
            Estos Términos se regirán por las leyes de República Dominicana. Cualquier disputa se resolverá en los tribunales competentes de República Dominicana.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">13. Modificaciones</h2>
          <p className="text-muted-foreground">
            Podemos modificar estos Términos en cualquier momento. Los cambios serán efectivos al publicarse. Tu uso continuado constituye aceptación de los nuevos términos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">14. Divisibilidad</h2>
          <p className="text-muted-foreground">
            Si alguna disposición de estos Términos es inválida o inaplicable, las demás disposiciones permanecerán en pleno vigor y efecto.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">15. Contacto</h2>
          <p className="text-muted-foreground">
            Para preguntas sobre estos Términos:
          </p>
          <p className="text-muted-foreground ml-4">
            <strong>Email:</strong> soporte@miturnow.com<br />
            <strong>Teléfono:</strong> +1 809-219-5141<br />
            <strong>Horario:</strong> Lunes a Viernes, 9:00 AM - 6:00 PM (Hora del Este)
          </p>
        </section>

        <section className="text-center pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">© 2025 Mí Turnow. Todos los derechos reservados.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Al usar esta aplicación, reconoces haber leído, comprendido y aceptado estos Términos y Condiciones en su totalidad.
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
