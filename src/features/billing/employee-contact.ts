export function buildWhatsAppHref(phoneNumber: string | null | undefined) {
  const digits = String(phoneNumber ?? "").replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  return `https://wa.me/${digits}`;
}
