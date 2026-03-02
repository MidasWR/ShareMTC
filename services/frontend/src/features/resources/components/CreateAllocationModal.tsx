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
  errors?: Partial<Record<"cpuCores" | "ramMB" | "gpuUnits", string>>;
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
  errors,
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
        <Input type="number" min={1} step={1} required label="CPU cores" error={errors?.cpuCores} value={cpuCores} onChange={(event) => onCPU(event.target.value)} />
        <Input type="number" min={1} step={512} required label="RAM MB" error={errors?.ramMB} value={ramMB} onChange={(event) => onRAM(event.target.value)} />
        <Input type="number" min={0} step={1} required label="GPU units" error={errors?.gpuUnits} value={gpuUnits} onChange={(event) => onGPU(event.target.value)} />
        <Button type="submit" className="w-full" loading={loading}>
          Create
        </Button>
      </form>
    </Modal>
  );
}
