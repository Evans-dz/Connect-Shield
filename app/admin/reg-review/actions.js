"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/auth/server";
import { supabaseService } from "@/lib/supabase";

// Must match ADMIN_EMAIL in page.js. Change this to move the gate to another email.
const ADMIN_EMAIL = "admin@connect-shield.com";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Not authorized");
  }
}

async function setStatus(id, status) {
  await assertAdmin();
  if (!id) return;
  const svc = supabaseService();
  await svc
    .from("reg_updates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/reg-review");
}

export async function publishUpdate(formData) {
  await setStatus(formData.get("id"), "published");
}

export async function rejectUpdate(formData) {
  await setStatus(formData.get("id"), "archived");
}
