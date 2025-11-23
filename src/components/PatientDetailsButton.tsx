import React from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/database.types";
import type { ButtonProps } from "@/components/ui/button";

/**
 * Reusable button component to navigate to patient details
 * Can be used in appointments, reports, or any patient-related view
 */
interface PatientDetailsButtonProps {
  patient: Patient | null;
  onViewDetails: (patient: Patient) => void;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

const PatientDetailsButton: React.FC<PatientDetailsButtonProps> = ({
  patient,
  onViewDetails,
  variant = "outline",
  size = "sm",
  className = "",
}) => {
  if (!patient) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => onViewDetails(patient)}
    >
      <User className="w-4 h-4 mr-2" />
      Ver Detalhes
    </Button>
  );
};

export default PatientDetailsButton;
