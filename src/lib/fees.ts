export function isFreeFee(fee: string | number | null | undefined): boolean {
  if (fee == null) return true;
  if (typeof fee === "number") return fee === 0;
  const s = fee.trim().toLowerCase();
  if (s === "") return true;
  if (s.includes("gratis") || s.includes("gratuito") || s.includes("sin costo")) return true;
  const digits = s.replace(/[^\d]/g, "");
  return digits === "" || digits === "0";
}
