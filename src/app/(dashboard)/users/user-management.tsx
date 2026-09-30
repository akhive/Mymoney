"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2, X } from "lucide-react";

type UserRole = "super_user" | "admin" | "user";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  role: UserRole;
  created_at: string;
}

const roleLabels: Record<UserRole, string> = {
  super_user: "Super User",
  admin: "Admin",
  user: "User",
};

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load users.");
        if (active) setUsers(result.users);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load users."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function reloadUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load users.");
    setUsers(result.users);
  }

  function openAddForm() {
    setEditingUser(null);
    setEmail("");
    setFullName("");
    setJobTitle("");
    setRole("user");
    setPassword("");
    setError(null);
    setFormOpen(true);
  }

  function openEditForm(user: ManagedUser) {
    setEditingUser(user);
    setEmail(user.email);
    setFullName(user.full_name);
    setJobTitle(user.job_title);
    setRole(user.role);
    setPassword("");
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, string> = {
      email,
      full_name: fullName,
      job_title: jobTitle,
      role,
    };
    if (password) body.password = password;

    try {
      const response = await fetch(
        editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users",
        {
          method: editingUser ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save user.");

      await reloadUsers();
      setFormOpen(false);
      setMessage(editingUser ? "User updated." : "User added.");
      setPassword("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: ManagedUser) {
    if (!window.confirm(`Delete the account for ${user.email}?`)) return;
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete user.");
      setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id));
      setMessage("User deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete user."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Role Management</h1>
          <p className="text-sm text-muted-foreground">
            Add users, set passwords and assign access categories
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus aria-hidden="true" />
          Add User
        </Button>
      </div>

      {message && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && !formOpen && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs font-medium uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Display name</th>
              <th className="px-4 py-3">Job role</th>
              <th className="px-4 py-3">Password</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-3 font-medium">{user.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.job_title || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Set</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.role === "super_user"
                          ? "bg-violet-100 text-violet-800"
                          : user.role === "admin"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {roleLabels[user.role] || roleLabels.user}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${user.email}`}
                        title="Edit user"
                        onClick={() => openEditForm(user)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${user.email}`}
                        title="Delete user"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFormOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
            className="w-full max-w-lg rounded-lg border bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 id="user-form-title" className="text-lg font-semibold">
                  {editingUser ? "Edit user" : "Add user"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editingUser ? "Update account details and access." : "Create an account with direct sign-in access."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => setFormOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                {error && (
                  <p role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="user-email">Username / email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-full-name">Display name</Label>
                  <Input
                    id="user-full-name"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-job-title">Job role</Label>
                  <Input
                    id="user-job-title"
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    placeholder="Accountant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-category">Category</Label>
                  <select
                    id="user-category"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                  >
                    <option value="super_user">Super User</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="user-password">
                    {editingUser ? "Set new password (optional)" : "Password"}
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    required={!editingUser}
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={editingUser ? "Leave blank to keep current password" : "At least 8 characters"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Passwords are managed by Supabase and cannot be viewed later.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingUser ? "Save changes" : "Create user"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}