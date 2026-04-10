import { describe, expect, it } from "vitest";

import {
  canRemoveEmployeePayoutRow,
  assertEmployeePayoutRemovable,
} from "./employee-payout";

describe("employee payout removal", () => {
  it("allows removing unpaid payout rows", () => {
    expect(canRemoveEmployeePayoutRow({ isPaid: false })).toBe(true);
  });

  it("blocks removing paid payout rows", () => {
    expect(canRemoveEmployeePayoutRow({ isPaid: true })).toBe(false);
    expect(() => assertEmployeePayoutRemovable({ isPaid: true })).toThrow(
      "Paid payout rows cannot be removed.",
    );
  });
});
