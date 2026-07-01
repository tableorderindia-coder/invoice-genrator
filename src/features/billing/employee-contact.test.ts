import { describe, expect, it } from "vitest";

import { buildWhatsAppHref } from "./employee-contact";

describe("employee contact helpers", () => {
  it("builds a WhatsApp link from a formatted phone number", () => {
    expect(buildWhatsAppHref("+91 98765 43210")).toBe("https://wa.me/919876543210");
  });

  it("does not build a WhatsApp link when the phone number has no digits", () => {
    expect(buildWhatsAppHref("")).toBeUndefined();
    expect(buildWhatsAppHref("not set")).toBeUndefined();
  });
});
