import { useState, useEffect } from "react";
import { Check, User } from "lucide-react";
import { Service } from "@/components/business/ServiceItem";
import { useTranslation } from "react-i18next";

interface Staff {
  id: string;
  name: string;
  specialty: string;
}

interface ServiceStaffAssignment {
  serviceId: string;
  serviceName: string;
  staffId: string | null;
}

interface MultiStaffSelectionProps {
  services: Service[];
  staffMembers: Staff[];
  onAssignmentsChange: (assignments: ServiceStaffAssignment[]) => void;
}

export function MultiStaffSelection({
  services,
  staffMembers,
  onAssignmentsChange,
}: MultiStaffSelectionProps) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<ServiceStaffAssignment[]>([]);

  // Initialize assignments when services change
  useEffect(() => {
    const initialAssignments = services.map((service) => ({
      serviceId: service.id,
      serviceName: service.name,
      staffId: null,
    }));
    setAssignments(initialAssignments);
  }, [services]);

  const handleStaffSelect = (serviceId: string, staffId: string) => {
    const newAssignments = assignments.map((assignment) =>
      assignment.serviceId === serviceId
        ? { ...assignment, staffId }
        : assignment
    );
    setAssignments(newAssignments);
    onAssignmentsChange(newAssignments);
  };

  if (services.length <= 1) {
    // Single service - show simple staff selection
    return (
      <div className="grid grid-cols-1 gap-3">
        {staffMembers.map((staff) => (
          <button
            key={staff.id}
            onClick={() => handleStaffSelect(services[0]?.id || "", staff.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
              assignments[0]?.staffId === staff.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">{staff.name}</p>
              <p className="text-sm text-muted-foreground">{staff.specialty}</p>
            </div>
            {assignments[0]?.staffId === staff.id && (
              <Check className="w-5 h-5 text-primary ml-auto" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Multiple services - show staff selection per service
  return (
    <div className="space-y-6">
      {services.map((service, index) => {
        const assignment = assignments.find((a) => a.serviceId === service.id);
        const selectedStaff = staffMembers.find(
          (s) => s.id === assignment?.staffId
        );

        return (
          <div key={service.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{service.name}</h3>
              {selectedStaff && (
                <span className="text-sm text-primary font-medium">
                  {selectedStaff.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {staffMembers.map((staff) => (
                <button
                  key={`${service.id}-${staff.id}`}
                  onClick={() => handleStaffSelect(service.id, staff.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    assignment?.staffId === staff.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {staff.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {staff.specialty}
                    </p>
                  </div>
                  {assignment?.staffId === staff.id && (
                    <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {index < services.length - 1 && (
              <div className="border-b border-border pt-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}
