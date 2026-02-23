import { Drawer } from "../../../../design/components/Drawer";
import { StatusBadge } from "../../../../design/patterns/StatusBadge";
import { Provider } from "../../../../types/api";

type Props = {
  selected: Provider | null;
  onClose: () => void;
};

export function ServerDetailsDrawer({ selected, onClose }: Props) {
  return (
    <Drawer open={Boolean(selected)} title="Server details" onClose={onClose}>
      {selected ? (
        <div className="space-y-3 text-sm text-textSecondary">
          <p><span className="text-textMuted">ID:</span> {selected.id}</p>
          <p><span className="text-textMuted">Display name:</span> {selected.display_name}</p>
          <p><span className="text-textMuted">Machine:</span> {selected.machine_id}</p>
          <p><span className="text-textMuted">Type:</span> {selected.provider_type}</p>
          <p><span className="text-textMuted">Network:</span> {selected.network_mbps} Mbps</p>
          <div><StatusBadge status={selected.online ? "online" : "offline"} /></div>
        </div>
      ) : null}
    </Drawer>
  );
}
