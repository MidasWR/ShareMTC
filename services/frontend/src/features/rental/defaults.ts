import { ServerOrder } from "../../types/api";

export const SERVER_ORDER_DEFAULTS: ServerOrder = {
  plan_id: "",
  os_name: "Ubuntu 22.04",
  network_mbps: 1000,
  cpu_cores: 8,
  ram_gb: 32,
  gpu_units: 1,
  period: "hourly"
};
