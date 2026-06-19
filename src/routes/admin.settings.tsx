import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Workstation } from "@/components/pran/Workstation";
import {
  downloadExport,
  importData,
  parseImportFile,
  getStorageStats,
  type ExportBundle,
} from "@/lib/data-export";
import { getStoredConfig, storeConfig, clearStoredConfig, type LLMConfig } from "@/lib/llm";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Pran — Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(getStoredConfig());
  const [llmProvider, setLlmProvider] = useState<"openai" | "anthropic">(
    llmConfig?.provider ?? "openai",
  );
  const [llmApiKey, setLlmApiKey] = useState(llmConfig?.apiKey ?? "");
  const [llmModel, setLlmModel] = useState(llmConfig?.model ?? "");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stats = getStorageStats();

  const handleSaveLLM = () => {
    if (!llmApiKey.trim()) return;
    const config: LLMConfig = {
      provider: llmProvider,
      apiKey: llmApiKey.trim(),
      model: llmModel.trim() || undefined,
    };
    storeConfig(config);
    setLlmConfig(config);
  };

  const handleClearLLM = () => {
    clearStoredConfig();
    setLlmConfig(null);
    setLlmApiKey("");
    setLlmModel("");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    setImportError(null);

    try {
      const bundle = await parseImportFile(file);
      const result = importData(bundle);
      setImportResult(
        `Imported: ${result.collections} collections, ${result.annotations} annotations, ${result.workspaces} workspaces, ${result.searches} searches`,
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Admin" }, { label: "Settings" }]}
      scene="Platform configuration"
    >
      <div className="mx-auto max-w-[800px] px-10 pt-28 pb-32">
        {/* Header */}
        <header className="border-b border-rule pb-10">
          <div className="mono-eyebrow mb-3 text-accent">Configuration</div>
          <h1 className="font-display text-5xl leading-[1.05]">Settings.</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            Configure LLM integration, manage data, and control platform behavior.
          </p>
        </header>

        {/* LLM Configuration */}
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-2">LLM Integration</h2>
          <p className="text-sm text-ink-2 mb-6">
            Configure an LLM provider for enhanced courtroom debates and intelligent analysis. API
            keys are stored locally and never sent to our servers.
          </p>

          <div className="rounded-xl border border-rule bg-card p-6">
            <div className="space-y-5">
              {/* Provider */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-2">
                  Provider
                </label>
                <div className="flex gap-3">
                  {(["openai", "anthropic"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setLlmProvider(p)}
                      className={`rounded-md px-4 py-2 font-mono text-xs transition-all ${
                        llmProvider === p
                          ? "bg-ink text-paper"
                          : "border border-rule text-ink-2 hover:bg-paper-2"
                      }`}
                    >
                      {p === "openai" ? "OpenAI" : "Anthropic"}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder={`sk-...${llmProvider === "anthropic" ? "ant-" : ""}`}
                  className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-2">
                  Model (optional)
                </label>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder={
                    llmProvider === "openai"
                      ? "gpt-4o (default)"
                      : "claude-sonnet-4-20250514 (default)"
                  }
                  className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Status */}
              {llmConfig && (
                <div className="rounded-md bg-paper-2 p-3 font-mono text-xs text-ink-2">
                  Configured: {llmConfig.provider}{" "}
                  {llmConfig.model ? `(${llmConfig.model})` : "(default model)"} · Key:{" "}
                  {llmConfig.apiKey.slice(0, 8)}...
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveLLM}
                  disabled={!llmApiKey.trim()}
                  className="rounded-md bg-ink px-4 py-2 font-mono text-xs text-paper transition-colors hover:bg-ink-2 disabled:opacity-40"
                >
                  Save Configuration
                </button>
                {llmConfig && (
                  <button
                    onClick={handleClearLLM}
                    className="rounded-md border border-rule px-4 py-2 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-2">Data Management</h2>
          <p className="text-sm text-ink-2 mb-6">
            Export your collections, annotations, and workspaces for backup or migration.
          </p>

          <div className="rounded-xl border border-rule bg-card p-6">
            {/* Storage stats */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <StorageStat label="Collections" value={stats.collections} />
              <StorageStat label="Annotations" value={stats.annotations} />
              <StorageStat label="Workspaces" value={stats.workspaces} />
              <StorageStat label="Searches" value={stats.searches} />
              <StorageStat
                label="Storage"
                value={`${(stats.totalSizeBytes / 1024).toFixed(1)}KB`}
              />
            </div>

            {/* Export */}
            <div className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-3">
                Export
              </div>
              <button
                onClick={downloadExport}
                className="rounded-md bg-ink px-4 py-2 font-mono text-xs text-paper transition-colors hover:bg-ink-2"
              >
                Download Export (JSON)
              </button>
            </div>

            {/* Import */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-3">
                Import
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-rule px-4 py-2 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-2"
              >
                Choose Import File
              </button>

              {importResult && (
                <div className="mt-3 rounded-md bg-[var(--color-tier-meta)]/10 p-3 font-mono text-xs text-[var(--color-tier-meta)]">
                  {importResult}
                </div>
              )}
              {importError && (
                <div className="mt-3 rounded-md bg-[var(--color-tier-case)]/10 p-3 font-mono text-xs text-[var(--color-tier-case)]">
                  {importError}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-6">Admin Pages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/admin/rate-limits"
              className="rounded-lg border border-rule bg-card p-5 transition-all hover:shadow-paper"
            >
              <div className="font-display text-lg">Rate Limit Dashboard</div>
              <div className="mt-1 font-mono text-xs text-ink-2">
                API consumption stats across all data sources
              </div>
            </Link>
            <Link
              to="/admin/errors"
              className="rounded-lg border border-rule bg-card p-5 transition-all hover:shadow-paper"
            >
              <div className="font-display text-lg">Error Monitor</div>
              <div className="mt-1 font-mono text-xs text-ink-2">
                Structured error capture and debugging
              </div>
            </Link>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

function StorageStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="font-display text-xl tabular-nums">{value}</div>
      <div className="font-mono text-[8px] uppercase tracking-wider text-ink-3">{label}</div>
    </div>
  );
}
