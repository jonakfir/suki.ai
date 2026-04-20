import { Droplets, Wind } from "lucide-react";
import { DomainView } from "@/components/domain/DomainView";

export default function HairPage() {
  return (
    <DomainView
      domain="haircare"
      title="Your hair"
      tagline="Wash day essentials and non-wash day care, built for your hair type."
      accentVar="--rose"
      timeLabels={{
        morning: {
          label: "Wash Day",
          icon: <Droplets size={15} className="text-accent" />,
        },
        evening: {
          label: "Non-Wash Day",
          icon: <Wind size={15} className="text-muted" />,
        },
      }}
    />
  );
}
