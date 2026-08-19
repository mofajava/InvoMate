"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/inbounds/");
  }, [router]);
  return (
    <Stack sx={{ minHeight: "100dvh", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Stack>
  );
}
