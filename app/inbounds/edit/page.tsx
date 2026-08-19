"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import InboundForm from "@/components/InboundForm";

function EditInner() {
  const id = useSearchParams().get("id") ?? undefined;
  return <InboundForm editId={id} />;
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<p>載入中…</p>}>
        <EditInner />
      </Suspense>
    </AppShell>
  );
}
