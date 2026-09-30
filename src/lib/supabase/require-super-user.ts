import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireSuperUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (profile?.role !== "super_user") {
    return {
      response: NextResponse.json({ error: "Super User access required." }, { status: 403 }),
    };
  }

  try {
    return { admin: createAdminClient(), userId: user.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase admin is unavailable.";
    return {
      response: NextResponse.json({ error: message }, { status: 500 }),
    };
  }
}