import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/types/database";
import { requireSuperUser } from "@/lib/supabase/require-super-user";

const roles: UserRole[] = ["super_user", "admin", "user"];

async function canRemoveSuperUser(
  admin: Awaited<ReturnType<typeof requireSuperUser>> extends infer T
    ? T extends { admin: infer A }
      ? A
      : never
    : never,
  targetId: string
) {
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError || target?.role !== "super_user") return { allowed: true };

  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_user");

  return { allowed: !error && (count || 0) > 1 };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireSuperUser();
  if ("response" in context) return context.response;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const profileChanges: Record<string, string | null> = {};
  if (typeof body.full_name === "string") {
    profileChanges.full_name = body.full_name.trim();
    if (!profileChanges.full_name) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }
  }
  if (typeof body.job_title === "string") {
    profileChanges.job_title = body.job_title.trim() || null;
  }
  if (typeof body.role === "string") {
    if (!roles.includes(body.role as UserRole)) {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }
    if (id === context.userId && body.role !== "super_user") {
      return NextResponse.json(
        { error: "You cannot remove your own Super User access." },
        { status: 400 }
      );
    }
    const protection = await canRemoveSuperUser(context.admin, id);
    if (body.role !== "super_user" && !protection.allowed) {
      return NextResponse.json(
        { error: "At least one Super User must remain." },
        { status: 400 }
      );
    }
    profileChanges.role = body.role;
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  if (email !== undefined) {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    profileChanges.email = email;
  }

  const password = typeof body.password === "string" ? body.password : undefined;
  if (password !== undefined && password !== "" && password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const hasAuthChanges = email !== undefined || Boolean(password);
  if (Object.keys(profileChanges).length === 0 && !hasAuthChanges) {
    return NextResponse.json({ error: "No changes to save." }, { status: 400 });
  }

  if (email !== undefined || (password && password.length > 0)) {
    const authChanges: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (email !== undefined) {
      authChanges.email = email;
      authChanges.email_confirm = true;
    }
    if (password) authChanges.password = password;

    const { error } = await context.admin.auth.admin.updateUserById(id, authChanges);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (Object.keys(profileChanges).length === 0) {
    return NextResponse.json({ success: true });
  }

  const { data, error } = await context.admin
    .from("profiles")
    .update(profileChanges)
    .eq("id", id)
    .select("id, email, full_name, job_title, role, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireSuperUser();
  if ("response" in context) return context.response;

  const { id } = await params;
  if (id === context.userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const protection = await canRemoveSuperUser(context.admin, id);
  if (!protection.allowed) {
    return NextResponse.json(
      { error: "At least one Super User must remain." },
      { status: 400 }
    );
  }

  const { error } = await context.admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}