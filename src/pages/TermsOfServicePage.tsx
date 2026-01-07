import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TermsOfServicePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
          <h1 className="text-lg font-semibold text-foreground">{t("terms.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="text-sm text-muted-foreground">
          {t("terms.lastUpdated")}: {new Date().toLocaleDateString()}
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section1Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section1Content")}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section2Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section2Content")}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section3Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section3Content")}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section4Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section4Content")}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section5Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section5Content")}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section6Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section6Content")}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("terms.section7Title")}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{t("terms.section7Content")}</p>
        </section>

        <section className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">© 2024 Bookwise. {t("terms.allRightsReserved")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("terms.contactEmail")}</p>
        </section>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
