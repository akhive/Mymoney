import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/types/database";
import { requireSuperUser } from "@/lib/supabase/require-super-user";

const roles: UserRole[] = ["super_user", "admin", "user"];

export async function GET() {
  const context = await requireSuperUser();
  if ("response" in context) return context.response;

  const [{ data: authData, error: authError }, { data: profiles, error: profileError }] =
    await Promise.all([
      context.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      context.admin
        .from("profiles")
        .select("id, email, full_name, job_title, role, created_at"),
    ]);

  if (authError || profileError) {
    return NextResponse.json(
      { error: authError?.message || profileError?.message || "Could not load users." },
      { status: 500 }
    );
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const users = authData.users.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: user.email || profile?.email || "",
      full_name:
        profile?.full_name || user.user_metadata?.full_name || "",
      job_title: profile?.job_title || "",
      role: profile?.role || "user",
      created_at: profile?.created_at || user.created_at,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const context = await requireSuperUser();
  if ("response" in context) return context.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const jobTitle = typeof body.job_title === "string" ? body.job_title.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (typeof role !== "string" || !roles.includes(role as UserRole)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  const { data, error } = await context.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Could not create user." },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await context.admin
    .from("profiles")
    .upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      job_title: jobTitle || null,
      role,
    })
    .select("id, email, full_name, job_title, role, created_at")
    .single();

  if (profileError) {
    await context.admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: profile }, { status: 201 });
}