import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignored when called from Server Component
          }
        },
      },
    }
  );
}

/**
 * Per-request cached helpers. The dashboard layout and the page render in
 * the same request, so wrapping these in React `cache()` means the auth check
 * and profile lookup happen once instead of once per component.
 */
export const getServerClient = cache(createClient);

export const getCurrentClaims = cache(async () => {
  const supabase = await getServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

export const getCurrentProfile = cache(async (userId: string) => {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name, preferred_currency")
    .eq("id", userId)
    .maybeSingle();
  return data;
});
