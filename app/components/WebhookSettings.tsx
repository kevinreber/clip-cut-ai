import { useState, useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface Webhook {
  _id: Id<"webhooks">;
  url: string;
  events: string[];
  active: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
}

interface WebhookSettingsProps {
  webhooks: Webhook[] | undefined;
  onAdd: (url: string, events: string[]) => Promise<void>;
  onDelete: (id: Id<"webhooks">) => Promise<void>;
  onToggle: (id: Id<"webhooks">, active: boolean) => Promise<void>;
  onTest: (id: Id<"webhooks">) => Promise<void>;
}

const AVAILABLE_EVENTS = [
  { value: "export.completed", label: "Export Completed", description: "Fires when a video or audio export finishes" },
  { value: "project.analyzed", label: "Project Analyzed", description: "Fires when video transcription completes" },
  { value: "project.created", label: "Project Created", description: "Fires when a new project is created" },
];

export function WebhookSettings({
  webhooks,
  onAdd,
  onDelete,
  onToggle,
  onTest,
}: WebhookSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["export.completed"]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || selectedEvents.length === 0) return;

    setSaving(true);
    try {
      await onAdd(newUrl.trim(), selectedEvents);
      setNewUrl("");
      setSelectedEvents(["export.completed"]);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  }, [newUrl, selectedEvents, onAdd]);

  const handleTest = useCallback(async (id: Id<"webhooks">) => {
    setTesting(id);
    try {
      await onTest(id);
    } finally {
      setTesting(null);
    }
  }, [onTest]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  return (
    <section
      className="rounded-lg border border-surface-lighter bg-surface-light p-6"
      data-testid="webhook-settings"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-white">Webhooks</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
            data-testid="add-webhook-btn"
          >
            Add Webhook
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-text-muted">
        Receive HTTP POST notifications when events happen in your account.
        Use with Zapier, Make, n8n, or your own server.
      </p>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-md border border-surface-lighter bg-surface p-4 space-y-3" data-testid="webhook-form">
          <div>
            <label className="text-xs font-medium text-white block mb-1">Webhook URL</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/..."
              className="w-full rounded-md border border-surface-lighter bg-surface-light px-3 py-2 text-sm text-white placeholder-text-muted/50 outline-none focus:border-primary"
              required
              data-testid="webhook-url-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white block mb-2">Events</label>
            <div className="space-y-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event.value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <span className="text-xs font-medium text-white">{event.label}</span>
                    <span className="text-[10px] text-text-muted block">{event.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !newUrl.trim() || selectedEvents.length === 0}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
              data-testid="save-webhook-btn"
            >
              {saving ? "Saving..." : "Save Webhook"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md bg-surface-lighter px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Webhook list */}
      {webhooks && webhooks.length > 0 ? (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh._id}
              className={`rounded-md border px-4 py-3 ${
                wh.active
                  ? "border-surface-lighter bg-surface"
                  : "border-surface-lighter/50 bg-surface/50 opacity-60"
              }`}
              data-testid="webhook-item"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      wh.active ? "bg-success" : "bg-text-muted"
                    }`}
                  />
                  <span className="text-sm text-white font-mono truncate">
                    {wh.url}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => handleTest(wh._id)}
                    disabled={testing === wh._id || !wh.active}
                    className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-white disabled:opacity-50"
                    data-testid="test-webhook-btn"
                  >
                    {testing === wh._id ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={() => onToggle(wh._id, !wh.active)}
                    className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-white"
                  >
                    {wh.active ? "Disable" : "Enable"}
                  </button>
                  {confirmDelete === wh._id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { onDelete(wh._id); setConfirmDelete(null); }}
                        className="rounded-md bg-danger/20 px-2 py-0.5 text-xs text-danger hover:bg-danger/30"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(wh._id)}
                      className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-danger"
                      data-testid="delete-webhook-btn"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <span>Events: {wh.events.join(", ")}</span>
                {wh.lastTriggeredAt && (
                  <span>Last triggered: {new Date(wh.lastTriggeredAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-surface-lighter bg-surface p-4 text-center">
          <p className="text-sm text-text-muted">No webhooks configured.</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Add a webhook to get notified when exports complete or projects are analyzed.
          </p>
        </div>
      )}

      {/* Documentation */}
      <details className="mt-4 group">
        <summary className="text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none">
          Webhook Documentation
        </summary>
        <div className="mt-3 rounded-md border border-surface-lighter bg-surface p-4 space-y-3 text-xs text-text-muted">
          <div>
            <h4 className="font-medium text-white mb-1">Payload Format</h4>
            <pre className="bg-surface-light rounded p-2 overflow-x-auto text-[10px] font-mono">
{`{
  "event": "export.completed",
  "timestamp": "2026-03-08T12:00:00Z",
  "data": {
    "projectId": "...",
    "projectName": "My Video",
    "exportFormat": "video",
    "exportQuality": "high"
  }
}`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">Integration Examples</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Zapier: Use "Webhooks by Zapier" trigger to auto-upload to YouTube</li>
              <li>Make (Integromat): Use "Custom Webhook" module for cloud storage sync</li>
              <li>n8n: Use "Webhook" node to trigger any automation workflow</li>
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}
