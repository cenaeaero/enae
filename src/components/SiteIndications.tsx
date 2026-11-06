import type { StudentSiteInfo } from "@/lib/practice-sites";

// Indicaciones del lugar de práctica para el alumno (portal TPEMS)
export default function SiteIndications({ site, className = "" }: { site: StudentSiteInfo | null | undefined; className?: string }) {
  if (!site) return null;
  const rows: [string, string, string | null][] = [
    ["🧭", "Cómo llegar / acceso", site.access_instructions],
    ["📌", "Punto de reunión", site.meeting_point],
    ["🏕️", "Servicios", site.services],
    ["👤", "Contacto en el lugar", [site.contact_name, site.contact_phone].filter(Boolean).join(" · ") || null],
    ["🚑", "Emergencias", [site.emergency_phone, site.nearest_medical_center].filter(Boolean).join(" · ") || null],
  ];
  return (
    <div className={`bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700 ${className}`}>
      <p className="font-semibold text-[#003366] mb-2">Indicaciones del lugar · {site.name}</p>
      <div className="space-y-1.5">
        {rows.filter(([, , v]) => !!v).map(([icon, label, v]) => (
          <p key={label} className="whitespace-pre-line"><span className="mr-1">{icon}</span><strong>{label}:</strong> {v}</p>
        ))}
      </div>
    </div>
  );
}
