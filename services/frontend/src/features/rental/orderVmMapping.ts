import { ServerOrder, VM } from "../../types/api";

export function getLinkedVMID(order: ServerOrder, manualLinks: Record<string, string>): string | undefined {
  if (!order.id) return undefined;
  return manualLinks[order.id];
}

export function buildVmSelectOptions(vms: VM[]): Array<{ value: string; label: string }> {
  return vms
    .filter((vm): vm is VM & { id: string } => Boolean(vm.id))
    .map((vm) => ({
      value: vm.id,
      label: `${vm.name || vm.id} (${vm.status || "unknown"})`
    }));
}
