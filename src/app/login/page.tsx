import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/events");

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-6">
        <p className="text-sm text-[var(--muted)]">מערכת משפחתית</p>
        <h1 className="mt-1 text-2xl font-bold">ניהול אירועים ומוזמנים</h1>
        <p className="mt-2 mb-6 text-[var(--ink-soft)]">התחברו כדי לנהל הזמנות, מעקבים וקיבולת.</p>
        <LoginForm />
      </div>
    </div>
  );
}
