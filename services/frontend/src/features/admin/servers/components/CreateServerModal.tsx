import { FormEvent } from "react";
import { Modal } from "../../../../design/components/Modal";
import { Button } from "../../../../design/primitives/Button";
import { Input } from "../../../../design/primitives/Input";
import { Select } from "../../../../design/primitives/Select";

type Props = {
  open: boolean;
  creating: boolean;
  form: {
    display_name: string;
    machine_id: string;
    provider_type: "internal" | "donor";
    network_mbps: string;
  };
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onChange: (name: "display_name" | "machine_id" | "provider_type" | "network_mbps", value: string) => void;
};

export function CreateServerModal({ open, creating, form, onClose, onSubmit, onChange }: Props) {
  return (
    <Modal open={open} title="Add server" description="Register a provider node in admin service." onClose={onClose}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input label="Display name" value={form.display_name} onChange={(event) => onChange("display_name", event.target.value)} />
        <Input label="Machine ID" value={form.machine_id} onChange={(event) => onChange("machine_id", event.target.value)} />
        <Select
          label="Provider type"
          value={form.provider_type}
          onChange={(event) => onChange("provider_type", event.target.value)}
          options={[
            { value: "donor", label: "Donor" },
            { value: "internal", label: "Internal" }
          ]}
        />
        <Input label="Network Mbps" value={form.network_mbps} onChange={(event) => onChange("network_mbps", event.target.value)} />
        <Button type="submit" className="w-full" loading={creating}>
          Add server
        </Button>
      </form>
    </Modal>
  );
}
