import { useEffect, useState } from "react";

type ShortcutGroup = {
  title: string;
  shortcuts: [string, string][];
};

const EDITOR_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Playback",
    shortcuts: [
      ["Space / K", "Play / Pause"],
      ["P", "Toggle preview mode"],
      ["\u2190 / \u2192", "Seek back / forward 5s"],
      ["J / L", "Seek back / forward 10s"],
      [", / .", "Previous / Next word"],
      ["0", "Jump to start"],
      ["[ / ]", "Slow down / Speed up playback"],
      ["M", "Mute / Unmute"],
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      ["Ctrl+Z", "Undo"],
      ["Ctrl+Shift+Z", "Redo"],
      ["Shift+Click", "Select word range"],
      ["Double-click", "Delete / Restore word"],
    ],
  },
  {
    title: "Search & Navigation",
    shortcuts: [
      ["/", "Focus search"],
      ["Ctrl+F", "Focus search"],
      ["F3 / Shift+F3", "Next / Previous search match"],
      ["?", "Toggle this help"],
    ],
  },
];

export function KeyboardShortcuts({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-surface-light border border-surface-lighter p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-xl"
          >
            &times;
          </button>
        </div>
        <div className="space-y-5">
          {EDITOR_SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.shortcuts.map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <kbd className="rounded bg-surface px-2 py-1 text-xs font-mono text-white border border-surface-lighter">
                      {key}
                    </kbd>
                    <span className="text-text-muted">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-surface-lighter text-center">
          <p className="text-xs text-text-muted">
            Press <kbd className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono border border-surface-lighter">?</kbd> or <kbd className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono border border-surface-lighter">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

export function useKeyboardShortcutsToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?") setOpen((o) => !o);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return { open, setOpen, onClose: () => setOpen(false) };
}
