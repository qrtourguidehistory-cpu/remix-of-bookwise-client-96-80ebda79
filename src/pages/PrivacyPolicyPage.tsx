import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sections = [
    { titleKey: "section1Title", contentKey: "section1Content" },
    { titleKey: "section2Title", contentKey: "section2Content" },
    { titleKey: "section3Title", contentKey: "section3Content" },
    { titleKey: "section4Title", contentKey: "section4Content" },
    { titleKey: "section5Title", contentKey: "section5Content" },
    { titleKey: "section6Title", contentKey: "section6Content" },
    { titleKey: "section7Title", contentKey: "section7Content" },
    { titleKey: "section8Title", contentKey: "section8Content" },
  ];

  const renderContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      if (line.startsWith('• ')) {
        return (
          <li key={index} className="text-foreground ml-4">
            {line.substring(2)}
          </li>
        );
      }
      return (
        <p key={index} className="text-foreground mb-2">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">{t("privacy.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section className="prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-xl font-bold text-foreground">{t("privacy.title")}</h2>
          <p className="text-muted-foreground">{t("privacy.lastUpdated")}: {t("common.yes") === "Sí" ? "Diciembre 2024" : "December 2024"}</p>

          {sections.map((section, index) => (
            <div key={index} className="mt-6">
              <h3 className="text-lg font-semibold text-foreground">
                {t(`privacy.${section.titleKey}`)}
              </h3>
              <div className="mt-2">
                {renderContent(t(`privacy.${section.contentKey}`))}
              </div>
            </div>
          ))}

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-foreground">
              {t("privacy.section9Title")}
            </h3>
            <p className="text-foreground mt-2">
              {t("privacy.section9Content")}
            </p>
            <p className="text-foreground mt-2">
              <strong>{t("privacy.contactEmail")}</strong><br />
              <strong>{t("privacy.contactPhone")}</strong>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
