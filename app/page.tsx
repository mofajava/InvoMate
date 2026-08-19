"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/inbounds/");
  }, [router]);
  return <p className="p-6">載入中…</p>;
}
