import { Suspense } from "react";
import { SuccessClient } from "@/app/success/SuccessClient";

export const metadata = { title: "Confirming your pass…" };

export default function SuccessPage() {
  return (
    <Suspense fallback={<p className="text-fg-muted">Confirming your pass…</p>}>
      <SuccessClient />
    </Suspense>
  );
}
