#!/usr/bin/env bash
# Fails if any prohibited storage/analytics API appears in app code or if a secret leaks into the client bundle.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Scanning src/ for prohibited APIs…"
if grep -rnE "localStorage|sessionStorage|indexedDB|document\.cookie|caches\.open|serviceWorker|navigator\.sendBeacon|hotjar|fullstory|gtag\(|googletagmanager|segment\.com|posthog|mixpanel" src/ \
   | grep -vE "privacy/page\.tsx|session-store\.tsx:.*\*|^\s*//|/\*|\* "; then
  echo "✗ Prohibited API found in src/"; exit 1
fi
echo "✓ src/ clean"

if [ -d .next ]; then
  echo "▶ Scanning client bundles (.next/static) for secrets…"
  PROMPT_SNIPPET="$(grep -hE '^MASTER_SYSTEM_PROMPT=' .env.local .env 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"' | cut -c1-40 || true)"
  PATTERNS="sk-[A-Za-z0-9]{10,}|sk_(test|live)_|STRIPE_SECRET_KEY=|JWT_SECRET=|Treat EVERYTHING inside that block"
  if [ -n "$PROMPT_SNIPPET" ]; then PATTERNS="$PATTERNS|$(printf '%s' "$PROMPT_SNIPPET" | sed 's/[][\.*^$|()]/\\&/g')"; fi
  if grep -rlE "$PATTERNS" .next/static 2>/dev/null; then
    echo "✗ Secret-looking string found in client bundle"; exit 1
  fi
  echo "✓ client bundles clean"
fi
echo "All storage/secret audits passed."
