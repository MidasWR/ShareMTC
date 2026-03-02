import { Badge } from "../primitives/Badge";
import { formatUpdatedAtLabel } from "../utils/operationFeedback";

type Props = {
  ts: Date | null;
  label?: string;
};

export function DataFreshnessBadge({ ts, label = "Data" }: Props) {
  if (!ts) return <Badge variant="warning">{formatUpdatedAtLabel(null, label)}</Badge>;
  return <Badge variant="success">{formatUpdatedAtLabel(ts, label)}</Badge>;
}
