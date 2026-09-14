/** Normalize a phone number to E.164 for duplicate checks. Israeli numbers default to +972. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const plus = trimmed.trim().startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("972")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length >= 9) {
    return `+972${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    return `+972${digits}`;
  }

  if (plus) {
    return `+${digits}`;
  }

  if (digits.length >= 8) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function phoneDigitsForWhatsApp(normalized: string | null | undefined): string | null {
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  return digits || null;
}

export function telHref(phone: string | null | undefined, normalized?: string | null): string | null {
  const value = normalized || normalizePhone(phone);
  return value ? `tel:${value}` : null;
}

export function whatsappHref(phone: string | null | undefined, normalized?: string | null): string | null {
  const digits = phoneDigitsForWhatsApp(normalized || normalizePhone(phone));
  return digits ? `https://wa.me/${digits}` : null;
}
