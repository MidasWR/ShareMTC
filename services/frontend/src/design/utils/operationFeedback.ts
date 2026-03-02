type OperationResult = "started" | "success" | "error" | "updated";

type OperationFeedbackInput = {
  action: string;
  entityType: string;
  entityName?: string;
  entityId?: string;
  result: OperationResult;
};

function normalizeEntity(input: Pick<OperationFeedbackInput, "entityType" | "entityName" | "entityId">) {
  const preferred = input.entityName?.trim() || input.entityId?.trim();
  if (preferred) return `${input.entityType} "${preferred}"`;
  return input.entityType;
}

export function formatOperationMessage(input: OperationFeedbackInput): string {
  const entity = normalizeEntity(input);
  if (input.result === "started") return `${input.action} started for ${entity}`;
  if (input.result === "updated") return `${entity} updated`;
  if (input.result === "success") return `${input.action} completed for ${entity}`;
  return `${input.action} failed for ${entity}`;
}

export function formatUpdatedAtLabel(value: Date | null, label = "Updated"): string {
  if (!value) return `${label}: stale`;
  return `${label}: ${value.toLocaleTimeString()}`;
}
