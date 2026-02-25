import { Badge } from "../primitives/Badge";

type Props = {
  ts: Date | null;
  label?: string;
};

export function DataFreshnessBadge({ ts, label = "Data" }: Props) {
  if (!ts) {
    return <Badge variant="warning">{label}: stale</Badge>;
  }
  return <Badge variant="success">{label}: {ts.toLocaleTimeString()}</Badge>;
}
