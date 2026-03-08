import { useState, useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface CleanupPreset {
  _id: Id<"cleanupPresets">;
  userId: string;
  name: string;
  description: string;
  category: string;
  silenceThreshold: number;
  customFillerWords: string[];
  confidenceThreshold: number;
  removeFillers: boolean;
  removeSilences: boolean;
  shortenSilences: boolean;
  shortenSilenceTarget: number;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
}

interface PresetsLibraryProps {
  presets: CleanupPreset[] | undefined;
  communityPresets: CleanupPreset[] | undefined;
  onSave: (preset: Omit<CleanupPreset, "_id" | "userId" | "usageCount" | "createdAt">) => Promise<void>;
  onDelete: (id: Id<"cleanupPresets">) => Promise<void>;
  onApply: (preset: CleanupPreset) => void;
  currentSettings: {
    silenceThreshold: number;
    customFillerWords: string[];
    confidenceThreshold: number;
  };
}

const BUILT_IN_PRESETS = [
  {
    name: "Podcast Clean",
    description: "Aggressive filler removal with moderate silence shortening. Ideal for interview-style podcasts.",
    category: "podcast",
    silenceThreshold: 1.5,
    customFillerWords: ["um", "uh", "like", "you know", "I mean", "sort of", "kind of", "basically", "actually", "literally"],
    confidenceThreshold: 0.4,
    removeFillers: true,
    removeSilences: false,
    shortenSilences: true,
    shortenSilenceTarget: 0.5,
  },
  {
    name: "Lecture Tighten",
    description: "Light cleanup that preserves natural pacing. Good for educational content where pauses aid understanding.",
    category: "education",
    silenceThreshold: 3.0,
    customFillerWords: ["um", "uh", "so", "right"],
    confidenceThreshold: 0.3,
    removeFillers: true,
    removeSilences: false,
    shortenSilences: true,
    shortenSilenceTarget: 1.0,
  },
  {
    name: "Interview Polish",
    description: "Balanced cleanup for multi-speaker content. Removes fillers but keeps natural conversation rhythm.",
    category: "interview",
    silenceThreshold: 2.0,
    customFillerWords: ["um", "uh", "like", "you know", "I mean", "well"],
    confidenceThreshold: 0.35,
    removeFillers: true,
    removeSilences: false,
    shortenSilences: true,
    shortenSilenceTarget: 0.8,
  },
  {
    name: "YouTube Fast-Cut",
    description: "Tight editing that removes all dead air. Creates an energetic pace popular with YouTube audiences.",
    category: "youtube",
    silenceThreshold: 0.8,
    customFillerWords: ["um", "uh", "like", "you know", "so", "basically", "actually", "literally", "right", "okay"],
    confidenceThreshold: 0.5,
    removeFillers: true,
    removeSilences: true,
    shortenSilences: false,
    shortenSilenceTarget: 0.3,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  podcast: "bg-blue-500/20 text-blue-400",
  education: "bg-green-500/20 text-green-400",
  interview: "bg-purple-500/20 text-purple-400",
  youtube: "bg-red-500/20 text-red-400",
  custom: "bg-yellow-500/20 text-yellow-400",
  community: "bg-cyan-500/20 text-cyan-400",
};

export function PresetsLibrary({
  presets,
  communityPresets,
  onSave,
  onDelete,
  onApply,
  currentSettings,
}: PresetsLibraryProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"built-in" | "my-presets" | "community">("built-in");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("custom");
  const [makePublic, setMakePublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSavePreset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: newName.trim(),
        description: newDescription.trim() || `Custom preset saved from current settings`,
        category: newCategory,
        silenceThreshold: currentSettings.silenceThreshold,
        customFillerWords: currentSettings.customFillerWords,
        confidenceThreshold: currentSettings.confidenceThreshold,
        removeFillers: true,
        removeSilences: false,
        shortenSilences: true,
        shortenSilenceTarget: 0.5,
        isPublic: makePublic,
      });
      setNewName("");
      setNewDescription("");
      setNewCategory("custom");
      setMakePublic(false);
      setShowSaveForm(false);
    } finally {
      setSaving(false);
    }
  }, [newName, newDescription, newCategory, makePublic, currentSettings, onSave]);

  const handleApplyBuiltIn = useCallback((preset: typeof BUILT_IN_PRESETS[number]) => {
    onApply({
      _id: "" as Id<"cleanupPresets">,
      userId: "",
      usageCount: 0,
      createdAt: 0,
      ...preset,
    });
  }, [onApply]);

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="presets-library"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Templates & Presets
        </h3>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-surface-lighter px-4 py-3 space-y-3">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("built-in")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "built-in"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="built-in-tab"
            >
              Built-in
            </button>
            <button
              onClick={() => setActiveTab("my-presets")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "my-presets"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="my-presets-tab"
            >
              My Presets {presets && presets.length > 0 ? `(${presets.length})` : ""}
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "community"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="community-tab"
            >
              Community
            </button>
          </div>

          {/* Built-in presets */}
          {activeTab === "built-in" && (
            <div className="space-y-2">
              {BUILT_IN_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.name}
                  name={preset.name}
                  description={preset.description}
                  category={preset.category}
                  settings={{
                    silenceThreshold: preset.silenceThreshold,
                    fillerWords: preset.customFillerWords.length,
                    confidenceThreshold: preset.confidenceThreshold,
                  }}
                  onApply={() => handleApplyBuiltIn(preset)}
                />
              ))}
            </div>
          )}

          {/* My presets */}
          {activeTab === "my-presets" && (
            <div className="space-y-2">
              {!showSaveForm && (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full rounded-md border border-dashed border-surface-lighter py-2 text-xs text-text-muted transition-colors hover:border-primary hover:text-primary"
                  data-testid="save-preset-btn"
                >
                  + Save Current Settings as Preset
                </button>
              )}

              {showSaveForm && (
                <form onSubmit={handleSavePreset} className="rounded-md border border-surface-lighter bg-surface p-3 space-y-2" data-testid="preset-save-form">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Preset name"
                    className="w-full rounded-md border border-surface-lighter bg-surface-light px-3 py-1.5 text-xs text-white placeholder-text-muted/50 outline-none focus:border-primary"
                    required
                    data-testid="preset-name-input"
                  />
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full rounded-md border border-surface-lighter bg-surface-light px-3 py-1.5 text-xs text-white placeholder-text-muted/50 outline-none focus:border-primary resize-none"
                  />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-md border border-surface-lighter bg-surface-light px-3 py-1.5 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="custom">Custom</option>
                    <option value="podcast">Podcast</option>
                    <option value="education">Education</option>
                    <option value="interview">Interview</option>
                    <option value="youtube">YouTube</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={makePublic}
                      onChange={(e) => setMakePublic(e.target.checked)}
                      className="accent-primary"
                    />
                    Share with community
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving || !newName.trim()}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Preset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSaveForm(false)}
                      className="rounded-md bg-surface-lighter px-3 py-1 text-xs text-text-muted hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {presets && presets.length > 0 ? (
                presets.map((preset) => (
                  <PresetCard
                    key={preset._id}
                    name={preset.name}
                    description={preset.description}
                    category={preset.category}
                    settings={{
                      silenceThreshold: preset.silenceThreshold,
                      fillerWords: preset.customFillerWords.length,
                      confidenceThreshold: preset.confidenceThreshold,
                    }}
                    onApply={() => onApply(preset)}
                    onDelete={
                      confirmDelete === preset._id
                        ? () => { onDelete(preset._id); setConfirmDelete(null); }
                        : undefined
                    }
                    onDeleteRequest={() => setConfirmDelete(preset._id)}
                    showDeleteConfirm={confirmDelete === preset._id}
                    onCancelDelete={() => setConfirmDelete(null)}
                    isPublic={preset.isPublic}
                    usageCount={preset.usageCount}
                  />
                ))
              ) : (
                !showSaveForm && (
                  <p className="text-xs text-text-muted text-center py-2">
                    No saved presets yet. Save your current settings to create one.
                  </p>
                )
              )}
            </div>
          )}

          {/* Community presets */}
          {activeTab === "community" && (
            <div className="space-y-2">
              {communityPresets && communityPresets.length > 0 ? (
                communityPresets.map((preset) => (
                  <PresetCard
                    key={preset._id}
                    name={preset.name}
                    description={preset.description}
                    category={preset.category}
                    settings={{
                      silenceThreshold: preset.silenceThreshold,
                      fillerWords: preset.customFillerWords.length,
                      confidenceThreshold: preset.confidenceThreshold,
                    }}
                    onApply={() => onApply(preset)}
                    usageCount={preset.usageCount}
                  />
                ))
              ) : (
                <p className="text-xs text-text-muted text-center py-4">
                  No community presets shared yet. Save a preset and toggle "Share with community" to be the first!
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PresetCard({
  name,
  description,
  category,
  settings,
  onApply,
  onDelete,
  onDeleteRequest,
  showDeleteConfirm,
  onCancelDelete,
  isPublic,
  usageCount,
}: {
  name: string;
  description: string;
  category: string;
  settings: { silenceThreshold: number; fillerWords: number; confidenceThreshold: number };
  onApply: () => void;
  onDelete?: () => void;
  onDeleteRequest?: () => void;
  showDeleteConfirm?: boolean;
  onCancelDelete?: () => void;
  isPublic?: boolean;
  usageCount?: number;
}) {
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.custom;

  return (
    <div
      className="rounded-lg border border-surface-lighter bg-surface p-3 transition-colors hover:border-primary/30"
      data-testid="preset-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-white">{name}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${colorClass}`}>
              {category}
            </span>
            {isPublic && (
              <span className="text-[9px] text-text-muted">(shared)</span>
            )}
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">{description}</p>
          <div className="flex gap-3 mt-1.5 text-[10px] text-text-muted/80">
            <span>Silence: {settings.silenceThreshold}s</span>
            <span>Fillers: {settings.fillerWords} words</span>
            <span>Confidence: {(settings.confidenceThreshold * 100).toFixed(0)}%</span>
            {usageCount !== undefined && usageCount > 0 && (
              <span>Used {usageCount}x</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onApply}
            className="rounded-md bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
            data-testid="apply-preset-btn"
          >
            Apply
          </button>
          {onDeleteRequest && !showDeleteConfirm && (
            <button
              onClick={onDeleteRequest}
              className="rounded-md bg-surface-lighter px-2 py-1 text-xs text-text-muted hover:text-danger"
              data-testid="delete-preset-btn"
            >
              Delete
            </button>
          )}
          {showDeleteConfirm && (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="rounded-md bg-danger/20 px-2 py-0.5 text-xs text-danger"
              >
                Confirm
              </button>
              <button
                onClick={onCancelDelete}
                className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
