"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/events",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = (error as AuthError & { cause?: { err?: { message?: string } } }).cause;
      if (cause?.err?.message === "disabled" || error.message.includes("disabled")) {
        return { error: "החשבון מושבת. פנו למנהל המערכת." };
      }
      return { error: "אימייל או סיסמה שגויים." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}
