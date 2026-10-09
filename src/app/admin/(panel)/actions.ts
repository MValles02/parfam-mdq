"use server";

import { signOut } from "@/lib/auth";
import { ADMIN_LOGIN_PATH } from "@/lib/auth.config";
import { requireAdmin } from "@/lib/admin/guard";

export async function signOutAdmin() {
  await requireAdmin();
  await signOut({ redirectTo: ADMIN_LOGIN_PATH });
}
