import { ServerOrder } from "../../types/api";

export function validateServerOrder(order: ServerOrder): string | null {
  if (!order.plan_id.trim()) return "Plan is required";
  if (!order.os_name.trim()) return "OS template is required";
  if (order.cpu_cores <= 0) return "CPU cores must be greater than 0";
  if (order.ram_gb <= 0) return "RAM must be greater than 0";
  if (order.gpu_units < 0) return "GPU units cannot be negative";
  if (order.network_mbps <= 0) return "Network Mbps must be greater than 0";
  if (order.period !== "hourly" && order.period !== "monthly") return "Billing period must be hourly or monthly";
  return null;
}
