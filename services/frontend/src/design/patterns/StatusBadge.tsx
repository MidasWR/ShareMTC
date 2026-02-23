import { Badge } from "../primitives/Badge";

type Status =
  | "starting"
  | "running"
  | "sleeping"
  | "stopped"
  | "error"
  | "online"
  | "offline";

export function StatusBadge({ status }: { status: Status }) {
  if (status === "running" || status === "online") return <Badge variant="success"><span className="mr-1 health-pulse" />{status}</Badge>;
  if (status === "starting" || status === "sleeping") return <Badge variant="info">{status}</Badge>;
  if (status === "stopped" || status === "offline") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="danger">{status}</Badge>;
}
