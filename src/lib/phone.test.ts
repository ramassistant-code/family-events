import { describe, expect, it } from "vitest";
import { normalizePhone, phoneDigitsForWhatsApp, telHref, whatsappHref } from "./phone";

describe("normalizePhone", () => {
  it("converts Israeli local numbers to E.164", () => {
    expect(normalizePhone("050-123-4567")).toBe("+972501234567");
    expect(normalizePhone("0527654321")).toBe("+972527654321");
    expect(normalizePhone("547778899")).toBe("+972547778899");
  });

  it("keeps already-international numbers", () => {
    expect(normalizePhone("+972501234567")).toBe("+972501234567");
    expect(normalizePhone("972501234567")).toBe("+972501234567");
    expect(normalizePhone("00972501234567")).toBe("+972501234567");
  });

  it("returns null for empty values", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("click-to-call links", () => {
  it("does not depend on status updates", () => {
    expect(telHref("0501234567")).toBe("tel:+972501234567");
    expect(whatsappHref("0501234567")).toBe("https://wa.me/972501234567");
    expect(phoneDigitsForWhatsApp("+972501234567")).toBe("972501234567");
  });
});
