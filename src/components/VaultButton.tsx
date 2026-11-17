"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Lock, X } from "lucide-react";
import type { Analysis } from "@/lib/shape";
import { MIN_PASSCODE_LENGTH, downloadJson, encryptVault, passcodeStrength, vaultFilename } from "@/lib/crypto-client";
import { cn } from "@/lib/cn";

interface Props {
  enabled: boolean;
  situation: string;
  result: Analysis;
}

type Phase = "idle" | "working" | "done" | "error";

export function VaultButton({ enabled, situation, result }: Props) {
  const [open, setOpen] = useState(false);
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const pass1Ref = useRef<HTMLInputElement>(null);

  const strength = passcodeStrength(pass1);
  const tooShort = pass1.length < MIN_PASSCODE_LENGTH;
  const mismatch = pass2.length > 0 && pass1 !== pass2;
  const canExport = !tooShort && pass1 === pass2 && phase !== "working";

  // Zero passcode state whenever the dialog closes (and on unmount).
  const reset = () => {
    setPass1("");
    setPass2("");
    setPhase("idle");
    setMessage(null);
  };
  useEffect(() => () => reset(), []);

  async function handleExport() {
    if (!canExport) return;
    setPhase("working");
    setMessage(null);
    try {
      const file = await encryptVault(
        { version: 1, createdAt: new Date().toISOString(), situation, result },
        pass1,
      );
      downloadJson(vaultFilename(), file);
      setPhase("done");
      setMessage("Saved. Keep your passcode safe — it is the only way to open the file.");
    } catch {
      setPhase("error");
      setMessage("Export failed on this device. Please try again.");
    } finally {
      // Zero the passcode immediately after use.
      setPass1("");
      setPass2("");
    }
  }

  const button = (
    <button
      type="button"
      className={cn("btn flex-1 text-base", enabled ? "btn-primary" : "btn-secondary")}
      disabled={!enabled}
      aria-disabled={!enabled}
      aria-describedby={enabled ? undefined : "vault-locked-hint"}
      onClick={() => enabled && setOpen(true)}
      data-testid="vault-button"
    >
      {enabled ? <Download className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-5 w-5" aria-hidden="true" />}
      Save to My Phone Vault
    </button>
  );

  return (
    <>
      {button}
      {!enabled ? (
        <span id="vault-locked-hint" className="sr-only">
          Unlock with a pass
        </span>
      ) : null}

      <Dialog.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-fg/40" />
          <Dialog.Content
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-card"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              pass1Ref.current?.focus();
            }}
            data-testid="vault-dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-xl font-semibold text-fg">Save to My Phone Vault</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-fg-muted">
                  Your analysis is encrypted on this device with a passcode you choose, then downloaded as a file. We never see it.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost h-11 w-11 rounded-full p-0" aria-label="Close">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            {phase === "done" ? (
              <div className="mt-5">
                <p role="status" className="rounded-xl border border-border bg-surface-muted p-3 text-sm text-fg" data-testid="vault-success">
                  {message}
                </p>
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-primary mt-4 w-full">
                    Done
                  </button>
                </Dialog.Close>
              </div>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleExport();
                }}
              >
                <div>
                  <label htmlFor="vault-pass1" className="block text-sm font-medium text-fg">
                    Passcode (min {MIN_PASSCODE_LENGTH} characters)
                  </label>
                  <input
                    ref={pass1Ref}
                    id="vault-pass1"
                    type="password"
                    autoComplete="new-password"
                    value={pass1}
                    onChange={(e) => setPass1(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-base focus:outline-none focus:ring-2 focus:ring-accent"
                    data-testid="vault-pass1"
                  />
                  <div className="mt-2 flex items-center gap-2" aria-live="polite">
                    <div className="flex flex-1 gap-1" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            strength.score >= n ? (strength.score === 3 ? "bg-accent" : "bg-warn-border") : "bg-border",
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-fg-muted">{pass1 ? strength.label : ""}</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="vault-pass2" className="block text-sm font-medium text-fg">
                    Repeat passcode
                  </label>
                  <input
                    id="vault-pass2"
                    type="password"
                    autoComplete="new-password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    aria-invalid={mismatch}
                    className={cn(
                      "mt-1 w-full rounded-xl border bg-surface p-3 text-base focus:outline-none focus:ring-2 focus:ring-accent",
                      mismatch ? "border-danger" : "border-border",
                    )}
                    data-testid="vault-pass2"
                  />
                  {mismatch ? <p className="mt-1 text-xs text-danger">Passcodes do not match.</p> : null}
                </div>

                <p className="rounded-xl border border-warn-border bg-warn-bg px-3 py-2 text-sm text-warn-fg">
                  <strong>We cannot recover this passcode.</strong> If you forget it, the file cannot be opened by anyone — including us.
                </p>

                {message ? (
                  <p role="alert" className="text-sm text-danger">
                    {message}
                  </p>
                ) : null}

                <button type="submit" className="btn btn-primary w-full" disabled={!canExport} data-testid="vault-export">
                  {phase === "working" ? "Encrypting…" : "Encrypt & download"}
                </button>
                <p className="text-center text-xs text-fg-subtle">
                  PBKDF2-SHA-256 (600k rounds) → AES-256-GCM, in your browser.
                </p>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
