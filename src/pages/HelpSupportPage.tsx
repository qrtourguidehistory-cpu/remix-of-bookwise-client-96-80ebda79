import { ArrowLeft, MessageCircle, Mail, Phone, FileText, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const HelpSupportPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const faqs = [
    {
      questionKey: "faqCancelAppointment",
      answerKey: "faqCancelAppointmentAnswer",
    },
    {
      questionKey: "faqPayments",
      answerKey: "faqPaymentsAnswer",
    },
    {
      questionKey: "faqModifyBooking",
      answerKey: "faqModifyBookingAnswer",
    },
    {
      questionKey: "faqBusinessCancel",
      answerKey: "faqBusinessCancelAnswer",
    },
    {
      questionKey: "faqLeaveReview",
      answerKey: "faqLeaveReviewAnswer",
    },
  ];

  const handleContact = (method: string) => {
    if (method === "phone") {
      window.location.href = "tel:+18092195141";
    } else if (method === "email") {
      window.location.href = "mailto:soporte@miturnow.com";
    } else {
      toast({
        title: t("help.contactingSupport"),
        description: `${t("help.opening")} ${method}...`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t("help.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Quick Contact */}
        <section className="animate-fade-in">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("help.quickContact")}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleContact("chat")}
              className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-2 hover:bg-secondary transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-gray-700" strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-foreground">{t("help.chat")}</span>
            </button>
            <button
              onClick={() => handleContact("email")}
              className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-2 hover:bg-secondary transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-700" strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-foreground">{t("help.email")}</span>
            </button>
            <button
              onClick={() => handleContact("phone")}
              className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-2 hover:bg-secondary transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Phone className="w-6 h-6 text-gray-700" strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-foreground">{t("help.call")}</span>
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("help.faq")}
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-border">
                  <AccordionTrigger className="px-4 text-left text-foreground hover:no-underline hover:bg-secondary/50">
                    {t(`help.${faq.questionKey}`)}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-muted-foreground">
                    {t(`help.${faq.answerKey}`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Contact Information */}
        <section className="animate-fade-in bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
            Información de Contacto
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-orange-600 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-medium text-gray-900">Teléfono</p>
                <a href="tel:+18092195141" className="text-orange-600 hover:text-orange-700 text-sm">
                  +1 809-219-5141
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-orange-600 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <a href="mailto:soporte@miturnow.com" className="text-orange-600 hover:text-orange-700 text-sm">
                  soporte@miturnow.com
                </a>
              </div>
            </div>
            <div className="pt-2 border-t border-orange-200">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Horario de atención:</span><br />
                Lunes a Viernes, 9:00 AM - 6:00 PM<br />
                (Hora del Este)
              </p>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("help.resources")}
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <a
              href="#"
              className="flex items-center justify-between px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-700" strokeWidth={2} />
                </div>
                <span className="font-medium text-foreground">{t("help.userGuide")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </a>
            <button
              onClick={() => navigate("/terms")}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-700" strokeWidth={2} />
                </div>
                <span className="font-medium text-foreground">{t("help.termsConditions")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/privacy-policy")}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-700" strokeWidth={2} />
                </div>
                <span className="font-medium text-foreground">{t("help.privacyPolicy")}</span>
              </div>
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* App Info */}
        <section className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <p className="text-sm text-muted-foreground">Mí Turnow v1.0.0</p>
          <p className="text-xs text-muted-foreground">© 2025 Mí Turnow. Todos los derechos reservados.</p>
        </section>
      </main>
    </div>
  );
};

export default HelpSupportPage;
