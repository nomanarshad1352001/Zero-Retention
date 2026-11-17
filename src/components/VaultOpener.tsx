"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen, Unlock } from "lucide-react";
import { decryptVault, parseVaultFile, VaultDecryptError, type VaultPayload } from "@/lib/crypto-client";
import { validateAnalysisShape, type Analysis } from "@/lib/shape";
import { ResultsAccordions } from "@/components/ResultsAccordions";
import { FullScreenModal } from "@/components/FullScreenModal";
import { findSubsection } from "@/lib/shape";
import { PrivacyBadge } from "@/components/PrivacyBadge";

/** Decrypts a vault file entirely in memory. Nothing is uploaded or stored. */
export function VaultOpener() {
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ payload: VaultPayload; analysis: Analysis } | null>(null);
  const [expanded, setExpanded] = useState<string[]>(["a1"]);
  const [modalTarget, setModalTarget] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    setError(null);
    setOpened(null);
    if (!f) return;
    setFileName(f.name);
    setFileText(await f.text());
  }

  async function open() {
    if (!fileText) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await decryptVault(parseVaultFile(fileText), passcode);
      const shape = validateAnalysisShape(payload.result);
      if (!shape.ok) throw new VaultDecryptError("Vault contents are invalid");
      setOpened({ payload, analysis: shape.value });
      setExpanded(["a1"]);
    } catch (e) {
      setError(e instanceof VaultDecryptError ? e.message : "Could not open this file.");
    } finally {
      setPasscode(""); // zero after use
      setBusy(false);
    }
  }

  const target = opened && modalTarget ? findSubsection(opened.analysis, modalTarget) : null;

  if (opened) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-fg">Vault opened</h1>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setOpened(null);
              setFileText(null);
              setFileName("");
            }}
          >
            Close
          </button>
        </div>
        <p className="text-sm text-fg-muted" data-testid="vault-opened-meta">
          Saved {new Date(opened.payload.createdAt).toLocaleString()} · decrypted in memory only.
        </p>
        <section className="card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-subtle">Original situation</h2>
          <p className="mt-2 whitespace-pre-line text-base text-fg" data-testid="vault-opened-situation">
            {opened.payload.situation}
          </p>
        </section>
        <ResultsAccordions
          analysis={opened.analysis}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onOpenSubsection={setModalTarget}
        />
        <FullScreenModal
          open={!!modalTarget}
          onOpenChange={(o) => {
            if (!o) setModalTarget(null);
          }}
          accordion={target?.accordion ?? null}
          subsection={target?.subsection ?? null}
        />
        <PrivacyBadge className="w-full justify-center" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-fg">Open a vault file</h1>
      <p className="text-fg-muted">
        Choose a <code>.vault.json</code> file you exported earlier and enter its passcode. Decryption happens in your browser; the file is never uploaded.
      </p>
      <form
        className="card space-y-4 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void open();
        }}
      >
        <div>
          <label htmlFor="vault-file" className="block text-sm font-medium text-fg">
            Vault file
          </label>
          <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-4 text-sm text-fg-muted hover:bg-surface">
            <FolderOpen className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">{fileName || "Tap to choose a file"}</span>
            <input
              id="vault-file"
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
              data-testid="vault-file-input"
            />
          </label>
        </div>
        <div>
          <label htmlFor="vault-open-pass" className="block text-sm font-medium text-fg">
            Passcode
          </label>
          <input
            id="vault-open-pass"
            type="password"
            autoComplete="off"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-base focus:outline-none focus:ring-2 focus:ring-accent"
            data-testid="vault-open-pass"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger" data-testid="vault-open-error">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary w-full" disabled={!fileText || !passcode || busy} data-testid="vault-open-submit">
          <Unlock className="h-5 w-5" aria-hidden="true" />
          {busy ? "Decrypting…" : "Open"}
        </button>
      </form>
      <Link href="/" className="btn btn-ghost">
        ← Back to the app
      </Link>
    </div>
  );
}
