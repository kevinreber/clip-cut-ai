import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { UserMenu } from "../components/UserMenu";
import { useToast } from "../components/Toast";
import { AuthForm } from "../components/AuthForm";
import { WebhookSettings } from "../components/WebhookSettings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return <SettingsContent />;
}

function SettingsContent() {
  const { addToast } = useToast();
  const apiKeyInfo = useQuery(api.userApiKeysHelpers.hasApiKey);
  const deleteApiKey = useMutation(api.userApiKeysHelpers.deleteApiKey);
  const validateAndSave = useAction(api.userApiKeys.validateAndSaveOpenAIKey);

  // Webhook queries/mutations
  const webhooks = useQuery(api.webhooks.list);
  const addWebhook = useMutation(api.webhooks.add);
  const removeWebhook = useMutation(api.webhooks.remove);
  const toggleWebhook = useMutation(api.webhooks.toggle);
  const testWebhook = useMutation(api.webhooks.test);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setSaving(true);
    try {
      await validateAndSave({ apiKey: apiKeyInput });
      addToast("API key saved and verified!", "success");
      setApiKeyInput("");
      setShowKey(false);
    } catch (err: any) {
      const message =
        err?.data ?? err?.message ?? "Failed to save API key.";
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey() {
    try {
      await deleteApiKey();
      addToast("API key removed.", "info");
      setConfirmDelete(false);
    } catch {
      addToast("Failed to remove API key.", "error");
    }
  }

  async function handleAddWebhook(url: string, events: string[]) {
    try {
      await addWebhook({ url, events });
      addToast("Webhook added!", "success");
    } catch (err: any) {
      addToast(err?.message ?? "Failed to add webhook.", "error");
      throw err;
    }
  }

  async function handleDeleteWebhook(id: Id<"webhooks">) {
    try {
      await removeWebhook({ id });
      addToast("Webhook removed.", "info");
    } catch {
      addToast("Failed to remove webhook.", "error");
    }
  }

  async function handleToggleWebhook(id: Id<"webhooks">, active: boolean) {
    try {
      await toggleWebhook({ id, active });
      addToast(active ? "Webhook enabled." : "Webhook disabled.", "info");
    } catch {
      addToast("Failed to update webhook.", "error");
    }
  }

  async function handleTestWebhook(id: Id<"webhooks">) {
    try {
      await testWebhook({ id });
      addToast("Test webhook sent!", "success");
    } catch {
      addToast("Failed to send test webhook.", "error");
    }
  }

  const hasSavedKey =
    apiKeyInfo && typeof apiKeyInfo === "object" && apiKeyInfo.hasSavedKey;
  const maskedKey =
    apiKeyInfo && typeof apiKeyInfo === "object" ? apiKeyInfo.maskedKey : null;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-text-muted transition-colors hover:text-white"
            >
              &larr;
            </Link>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Settings
            </h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* API Key Section */}
        <section className="rounded-lg border border-surface-lighter bg-surface-light p-6">
          <h2 className="mb-1 text-lg font-semibold text-white">
            OpenAI API Key
          </h2>
          <p className="mb-6 text-sm text-text-muted">
            Add your own OpenAI API key to use your own account for video
            transcription. Your key is stored securely and never shared.
          </p>

          {/* Current key status */}
          {hasSavedKey ? (
            <div className="mb-6 flex items-center gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  API key configured
                </p>
                <p className="font-mono text-xs text-text-muted">
                  {maskedKey}
                </p>
              </div>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteKey}
                    className="rounded-md bg-danger/20 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md bg-surface-lighter px-3 py-1 text-xs text-text-muted transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md bg-surface-lighter px-3 py-1 text-xs text-text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning" />
              <p className="text-sm text-text-muted">
                No API key configured. Using the platform's shared key (usage
                may be limited).
              </p>
            </div>
          )}

          {/* Key input form */}
          <form onSubmit={handleSaveKey} className="mb-8">
            <label
              htmlFor="apiKey"
              className="mb-2 block text-sm font-medium text-white"
            >
              {hasSavedKey ? "Replace API Key" : "Enter API Key"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-surface-lighter bg-surface px-3 py-2 font-mono text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="submit"
                disabled={saving || !apiKeyInput.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Verifying..." : "Save Key"}
              </button>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Your key is validated against the OpenAI API before saving.
            </p>
          </form>

          {/* How to get an API key */}
          <div className="border-t border-surface-lighter pt-6">
            <h3 className="mb-4 text-sm font-semibold text-white">
              How to get an OpenAI API key
            </h3>
            <ol className="space-y-3 text-sm text-text-muted">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  1
                </span>
                <span>
                  Go to{" "}
                  <a
                    href="https://platform.openai.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    platform.openai.com
                  </a>{" "}
                  and create an account (or sign in).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  2
                </span>
                <span>
                  Navigate to{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    API Keys
                  </a>{" "}
                  in your dashboard.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  3
                </span>
                <span>
                  Click <strong className="text-white">"Create new secret key"</strong>, give it a
                  name (e.g., "ClipCut AI"), and copy the key.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  4
                </span>
                <span>
                  Paste the key above. We'll verify it works before saving.
                </span>
              </li>
            </ol>

            <div className="mt-6 rounded-md border border-surface-lighter bg-surface p-4">
              <h4 className="mb-2 text-sm font-medium text-white">
                Pricing & usage
              </h4>
              <ul className="space-y-1 text-xs text-text-muted">
                <li>
                  ClipCut AI uses the <strong className="text-white">Whisper</strong> model for
                  transcription.
                </li>
                <li>
                  Whisper costs <strong className="text-white">$0.006 per minute</strong> of audio
                  — a 10-minute video costs about $0.06.
                </li>
                <li>
                  OpenAI offers free credits for new accounts. Check your{" "}
                  <a
                    href="https://platform.openai.com/usage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    usage dashboard
                  </a>{" "}
                  for current balance.
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-2 text-sm font-medium text-white">
                Security notes
              </h4>
              <ul className="space-y-1 text-xs text-text-muted">
                <li>
                  Your API key is stored securely on our backend and is never
                  exposed to the browser.
                </li>
                <li>
                  We only use your key for Whisper transcription — nothing
                  else.
                </li>
                <li>
                  You can revoke your key anytime from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    OpenAI's dashboard
                  </a>
                  .
                </li>
                <li>
                  We recommend creating a key with only the permissions you
                  need.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Webhook Settings */}
        <WebhookSettings
          webhooks={webhooks}
          onAdd={handleAddWebhook}
          onDelete={handleDeleteWebhook}
          onToggle={handleToggleWebhook}
          onTest={handleTestWebhook}
        />
      </main>
    </div>
  );
}
