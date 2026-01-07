import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";

interface EarlyArrivalModalProps {
  open: boolean;
  appointmentId: string;
  onConfirm: () => void;
  onReject: () => void;
}

export const EarlyArrivalModal: React.FC<EarlyArrivalModalProps> = ({
  open,
  appointmentId,
  onConfirm,
  onReject,
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // The actual confirmation logic is handled in EarlyArrivalHandler
      // This modal just triggers the callback
      await onConfirm();
      toast({
        title: t("earlyArrival.confirmedTitle"),
        description: t("earlyArrival.confirmedMessage"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error?.message || t("earlyArrival.errorConfirming"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="sm:max-w-md z-[100] [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {t("earlyArrival.title")}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            {t("earlyArrival.message")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {t("earlyArrival.confirmButton")}
          </Button>

          <Button
            onClick={handleReject}
            disabled={isSubmitting}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <XCircle className="w-5 h-5 mr-2" />
            {t("earlyArrival.rejectButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

