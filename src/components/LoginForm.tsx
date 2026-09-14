"use client";

import { loginAction } from "@/actions/auth";
import { useActionState } from "react";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await loginAction(formData);
      return result ?? null;
    },
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      <label className="field">
        <span>אימייל</span>
        <input className="input" type="email" name="email" autoComplete="username" required />
      </label>
      <label className="field">
        <span>סיסמה</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.error ? (
        <p className="rounded-xl bg-[#f8e0e0] px-3 py-2 text-[var(--no)]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn btn-primary w-full" disabled={pending} type="submit">
        {pending ? "מתחבר…" : "התחבר"}
      </button>
    </form>
  );
}
