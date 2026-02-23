import { Modal } from "../design/components/Modal";

type KeyboardShortcutsPanelProps = {
  open: boolean;
  onClose: () => void;
};

const shortcuts = [
  { key: "?", action: "Open shortcuts panel" },
  { key: "Alt+1..Alt+6", action: "Jump to primary sections (role-aware)" },
  { key: "Esc", action: "Close modal/drawer" },
  { key: "Tab / Shift+Tab", action: "Move between controls" },
  { key: "Arrow Left/Right", action: "Switch tabs in segmented controls" }
];

export function KeyboardShortcutsPanel({ open, onClose }: KeyboardShortcutsPanelProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" description="Quick navigation and accessibility shortcuts.">
      <div className="space-y-2">
        {shortcuts.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-md border border-border bg-elevated/20 px-3 py-2">
            <kbd className="rounded bg-canvas px-2 py-1 font-mono text-xs">{item.key}</kbd>
            <span className="text-sm text-textSecondary">{item.action}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
