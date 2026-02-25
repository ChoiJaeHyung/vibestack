"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthStateListener() {
  const router = useRouter();
  const wasAuthenticated = useRef(true); // dashboard layout이므로 초기값 true

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && wasAuthenticated.current) {
        router.push("/login?expired=true");
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        wasAuthenticated.current = true;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
