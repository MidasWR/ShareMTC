import { FormEvent } from "react";
import { Modal } from "../../../design/components/Modal";
import { Button } from "../../../design/primitives/Button";
import { Input } from "../../../design/primitives/Input";

type Props = {
  open: boolean;
  cpuCores: string;
  ramMB: string;
  gpuUnits: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onCPU: (value: string) => void;
  onRAM: (value: string) => void;
  onGPU: (value: string) => void;
};

export function CreateAllocationModal({
  open,
  cpuCores,
  ramMB,
  gpuUnits,
  loading,
  onClose,
  onSubmit,
  onCPU,
  onRAM,
  onGPU
}: Props) {
  return (
    <Modal
      open={open}
      title="Create pod allocation"
      description="Wizard step 1/1: capacity request. Contracts are unchanged."
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input label="CPU cores" value={cpuCores} onChange={(event) => onCPU(event.target.value)} />
        <Input label="RAM MB" value={ramMB} onChange={(event) => onRAM(event.target.value)} />
        <Input label="GPU units" value={gpuUnits} onChange={(event) => onGPU(event.target.value)} />
        <Button type="submit" className="w-full" loading={loading}>
          Create
        </Button>
      </form>
    </Modal>
  );
}
