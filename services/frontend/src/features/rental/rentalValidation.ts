import { ServerOrder } from "../../types/api";

export type ServerOrderField =
  | "plan_id"
  | "name"
  | "os_name"
  | "cpu_cores"
  | "ram_gb"
  | "gpu_units"
  | "network_mbps"
  | "period";

export type ServerOrderValidationErrors = Partial<Record<ServerOrderField, string>>;

export function validateServerOrder(order: ServerOrder): ServerOrderValidationErrors {
  const errors: ServerOrderValidationErrors = {};
  if (!order.plan_id.trim()) errors.plan_id = "Plan is required";
  if (!order.name.trim()) errors.name = "Instance name is required";
  if (!order.os_name.trim()) errors.os_name = "OS template is required";
  if (order.cpu_cores <= 0) errors.cpu_cores = "CPU cores must be greater than 0";
  if (order.ram_gb <= 0) errors.ram_gb = "RAM must be greater than 0";
  if (order.gpu_units < 0) errors.gpu_units = "GPU units cannot be negative";
  if (order.network_mbps <= 0) errors.network_mbps = "Network Mbps must be greater than 0";
  if (order.period !== "hourly" && order.period !== "monthly") errors.period = "Billing period must be hourly or monthly";
  return errors;
}

export function firstServerOrderError(errors: ServerOrderValidationErrors): string | null {
  for (const key of Object.keys(errors) as ServerOrderField[]) {
    if (errors[key]) return errors[key] ?? null;
  }
  return null;
}
