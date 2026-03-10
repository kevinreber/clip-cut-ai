import { useState, useCallback, useRef, useEffect } from "react";

type TemplateStyle = "fade-text" | "logo-card" | "lower-third" | "full-screen";

interface IntroOutroTemplate {
  id: string;
  name: string;
  type: "intro" | "outro";
  style: TemplateStyle;
  text: string;
  subtext: string;
  duration: number; // seconds
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const STYLE_INFO: Record<TemplateStyle, { label: string; description: string }> = {
  "fade-text": {
    label: "Fade Text",
    description: "Text fades in/out on a solid background",
  },
  "logo-card": {
    label: "Logo Card",
    description: "Centered text with accent border",
  },
  "lower-third": {
    label: "Lower Third",
    description: "Title bar at the bottom of the frame",
  },
  "full-screen": {
    label: "Full Screen",
    description: "Bold text filling the entire frame",
  },
};

const PRESET_TEMPLATES: IntroOutroTemplate[] = [
  {
    id: "preset-intro-podcast",
    name: "Podcast Intro",
    type: "intro",
    style: "fade-text",
    text: "My Podcast",
    subtext: "Episode Title",
    duration: 3,
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    accentColor: "#3b82f6",
  },
  {
    id: "preset-intro-youtube",
    name: "YouTube Intro",
    type: "intro",
    style: "logo-card",
    text: "Channel Name",
    subtext: "Subscribe for more!",
    duration: 4,
    backgroundColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#ef4444",
  },
  {
    id: "preset-outro-cta",
    name: "Call to Action",
    type: "outro",
    style: "full-screen",
    text: "Thanks for Watching!",
    subtext: "Like & Subscribe",
    duration: 5,
    backgroundColor: "#1e1b4b",
    textColor: "#ffffff",
    accentColor: "#8b5cf6",
  },
  {
    id: "preset-outro-social",
    name: "Social Links",
    type: "outro",
    style: "lower-third",
    text: "Follow Me",
    subtext: "@handle on all platforms",
    duration: 4,
    backgroundColor: "#0c0a09",
    textColor: "#ffffff",
    accentColor: "#f59e0b",
  },
];

const COLOR_PRESETS = [
  "#0f172a", "#000000", "#1e1b4b", "#0c0a09", "#18181b",
  "#1e3a5f", "#2d1b69", "#1a3c34", "#3b0a0a", "#1c1917",
];

interface IntroOutroTemplatesProps {
  introTemplate: IntroOutroTemplate | null;
  outroTemplate: IntroOutroTemplate | null;
  onIntroChange: (template: IntroOutroTemplate | null) => void;
  onOutroChange: (template: IntroOutroTemplate | null) => void;
}

export function IntroOutroTemplates({
  introTemplate,
  outroTemplate,
  onIntroChange,
  onOutroChange,
}: IntroOutroTemplatesProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"intro" | "outro">("intro");
  const [editingTemplate, setEditingTemplate] = useState<IntroOutroTemplate | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeTemplate = activeTab === "intro" ? introTemplate : outroTemplate;
  const setActiveTemplate = activeTab === "intro" ? onIntroChange : onOutroChange;

  const startFromPreset = useCallback((preset: IntroOutroTemplate) => {
    const template = {
      ...preset,
      id: `custom-${Date.now()}`,
      type: activeTab as "intro" | "outro",
    };
    setEditingTemplate(template);
  }, [activeTab]);

  const applyTemplate = useCallback(() => {
    if (editingTemplate) {
      setActiveTemplate(editingTemplate);
      setEditingTemplate(null);
    }
  }, [editingTemplate, setActiveTemplate]);

  const removeTemplate = useCallback(() => {
    setActiveTemplate(null);
    setEditingTemplate(null);
  }, [setActiveTemplate]);

  // Render preview on canvas
  useEffect(() => {
    const template = editingTemplate || activeTemplate;
    if (!template || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = template.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    switch (template.style) {
      case "fade-text": {
        ctx.textAlign = "center";
        ctx.fillStyle = template.textColor;
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.fillText(template.text, w / 2, h / 2 - 10);
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillStyle = template.accentColor;
        ctx.fillText(template.subtext, w / 2, h / 2 + 20);
        break;
      }
      case "logo-card": {
        // Border
        ctx.strokeStyle = template.accentColor;
        ctx.lineWidth = 3;
        const pad = 40;
        ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
        ctx.textAlign = "center";
        ctx.fillStyle = template.textColor;
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText(template.text, w / 2, h / 2 - 10);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillStyle = template.accentColor;
        ctx.fillText(template.subtext, w / 2, h / 2 + 20);
        break;
      }
      case "lower-third": {
        // Bar at bottom
        const barH = 60;
        ctx.fillStyle = template.accentColor + "cc";
        ctx.fillRect(0, h - barH, w, barH);
        ctx.textAlign = "left";
        ctx.fillStyle = template.textColor;
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText(template.text, 20, h - barH + 25);
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(template.subtext, 20, h - barH + 45);
        break;
      }
      case "full-screen": {
        ctx.textAlign = "center";
        ctx.fillStyle = template.textColor;
        ctx.font = "bold 36px system-ui, sans-serif";
        ctx.fillText(template.text, w / 2, h / 2 - 15);
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillStyle = template.accentColor;
        ctx.fillText(template.subtext, w / 2, h / 2 + 20);
        break;
      }
    }
  }, [editingTemplate, activeTemplate]);

  const hasAny = introTemplate || outroTemplate;

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="intro-outro-templates"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Intro/Outro Templates
          {hasAny && (
            <span className="ml-1.5 text-xs font-normal text-success">
              ({[introTemplate && "Intro", outroTemplate && "Outro"].filter(Boolean).join(" + ")})
            </span>
          )}
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
              onClick={() => { setActiveTab("intro"); setEditingTemplate(null); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "intro"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="intro-tab"
            >
              Intro {introTemplate ? "(*)" : ""}
            </button>
            <button
              onClick={() => { setActiveTab("outro"); setEditingTemplate(null); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "outro"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="outro-tab"
            >
              Outro {outroTemplate ? "(*)" : ""}
            </button>
          </div>

          {/* Preset templates */}
          <div>
            <span className="text-xs font-medium text-text-muted block mb-2">
              Start from a preset
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TEMPLATES.filter((p) => p.type === activeTab).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => startFromPreset(preset)}
                  className="rounded-lg border border-surface-lighter px-3 py-2 text-left transition-colors hover:border-primary/40 hover:text-text"
                  data-testid={`preset-${preset.id}`}
                >
                  <span className="text-xs font-medium text-white block">{preset.name}</span>
                  <span className="text-[10px] text-text-muted block">{STYLE_INFO[preset.style].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active template or editor */}
          {(editingTemplate || activeTemplate) && (
            <div className="space-y-3">
              {/* Preview */}
              <div>
                <span className="text-xs font-medium text-text-muted block mb-1">Preview</span>
                <canvas
                  ref={canvasRef}
                  width={384}
                  height={216}
                  className="w-full rounded-md border border-surface-lighter"
                  data-testid="template-preview"
                />
              </div>

              {/* Editor */}
              {editingTemplate && (
                <div className="space-y-2" data-testid="template-editor">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Style</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(STYLE_INFO) as TemplateStyle[]).map((style) => (
                        <button
                          key={style}
                          onClick={() => setEditingTemplate({ ...editingTemplate, style })}
                          className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                            editingTemplate.style === style
                              ? "border-primary bg-primary/10 text-white"
                              : "border-surface-lighter text-text-muted hover:text-white"
                          }`}
                        >
                          {STYLE_INFO[style].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted block mb-1">Main Text</label>
                    <input
                      type="text"
                      value={editingTemplate.text}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, text: e.target.value })}
                      className="w-full rounded-md border border-surface-lighter bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-primary"
                      data-testid="template-text-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-muted block mb-1">Subtext</label>
                    <input
                      type="text"
                      value={editingTemplate.subtext}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subtext: e.target.value })}
                      className="w-full rounded-md border border-surface-lighter bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-primary"
                      data-testid="template-subtext-input"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-text-muted">Duration</label>
                      <span className="text-xs text-white font-mono">{editingTemplate.duration}s</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="1"
                      value={editingTemplate.duration}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, duration: parseInt(e.target.value) })}
                      className="w-full h-1.5 rounded-full appearance-none bg-surface-lighter cursor-pointer accent-primary"
                      data-testid="template-duration"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-muted block mb-1">Background Color</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditingTemplate({ ...editingTemplate, backgroundColor: color })}
                          className={`w-6 h-6 rounded-md border-2 transition-all ${
                            editingTemplate.backgroundColor === color
                              ? "border-primary scale-110"
                              : "border-surface-lighter hover:border-text-muted"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted block mb-1">Accent Color</label>
                    <input
                      type="color"
                      value={editingTemplate.accentColor}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, accentColor: e.target.value })}
                      className="w-8 h-6 rounded cursor-pointer bg-transparent"
                      data-testid="template-accent-color"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={applyTemplate}
                      className="flex-1 rounded-md bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
                      data-testid="apply-template-btn"
                    >
                      Apply {activeTab === "intro" ? "Intro" : "Outro"}
                    </button>
                    <button
                      onClick={() => setEditingTemplate(null)}
                      className="rounded-md bg-surface-lighter px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Applied template info */}
              {activeTemplate && !editingTemplate && (
                <div className="flex items-center gap-2" data-testid="applied-template">
                  <span className="text-xs text-success">
                    {activeTab === "intro" ? "Intro" : "Outro"} applied: {STYLE_INFO[activeTemplate.style].label} ({activeTemplate.duration}s)
                  </span>
                  <button
                    onClick={() => {
                      setEditingTemplate(activeTemplate);
                    }}
                    className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={removeTemplate}
                    className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/30"
                    data-testid="remove-template-btn"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
