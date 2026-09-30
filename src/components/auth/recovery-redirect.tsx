"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RecoveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("type") !== "recovery") return;

    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/reset-password");
      });
  }, [router]);

  return null;
}