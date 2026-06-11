import { describe, expect, it } from "vitest";
import { canTransition, isFinalStatus, isKnownStatus } from "./status-rules";

describe("requisition status rules", () => {
  it("allows configured operational transitions", () => {
    expect(canTransition("PENDING", "IN_REVIEW")).toBe(true);
    expect(canTransition("APPROVED", "READY_TO_DELIVER")).toBe(true);
    expect(canTransition("APPROVED", "PARTIALLY_DELIVERED")).toBe(true);
    expect(canTransition("PARTIALLY_DELIVERED", "IN_PURCHASE")).toBe(true);
  });

  it("blocks transitions from final statuses", () => {
    expect(isFinalStatus("REJECTED")).toBe(true);
    expect(isFinalStatus("DELIVERED")).toBe(true);
    expect(canTransition("REJECTED", "IN_REVIEW")).toBe(false);
  });

  it("rejects unknown statuses", () => {
    expect(isKnownStatus("CONSULTA")).toBe(false);
    expect(canTransition("PENDING", "CONSULTA")).toBe(false);
  });
});
