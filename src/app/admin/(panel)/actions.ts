"use server";

import { signOut } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin/guard";

export async function signOutAdmin() {
  await requireAdmin();
  await signOut({ redirectTo: "/admin/login" });
}
