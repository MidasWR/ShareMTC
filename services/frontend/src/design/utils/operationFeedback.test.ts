import { describe, expect, it } from "vitest";
import { formatOperationMessage, formatUpdatedAtLabel } from "./operationFeedback";

describe("operation feedback formatting", () => {
  it("formats contextual success message with entity name", () => {
    expect(
      formatOperationMessage({
        action: "Create",
        entityType: "VM",
        entityName: "trainer-01",
        result: "success"
      })
    ).toBe('Create completed for VM "trainer-01"');
  });

  it("falls back to entity id when name is missing", () => {
    expect(
      formatOperationMessage({
        action: "Terminate",
        entityType: "VM",
        entityId: "vm-1",
        result: "error"
      })
    ).toBe('Terminate failed for VM "vm-1"');
  });

  it("formats stale and fresh labels", () => {
    expect(formatUpdatedAtLabel(null, "VM list")).toBe("VM list: stale");
    expect(formatUpdatedAtLabel(new Date("2026-01-01T10:00:00Z"), "VM list").startsWith("VM list:")).toBe(true);
  });
});
