"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import OutboundForm from "@/components/OutboundForm";

function EditInner() {
  const id = useSearchParams().get("id") ?? undefined;
  return <OutboundForm editId={id} />;
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<CircularProgress />}>
        <EditInner />
      </Suspense>
    </AppShell>
  );
}
