import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/events");

  return (
    <div className="login-canvas">
      <div className="card login-card">
        <p className="label-caps">מערכת משפחתית</p>
        <h1 className="page-title mt-2">ניהול אירועים ומוזמנים</h1>
        <p className="mt-2 mb-6 text-[var(--ink-soft)]">התחברו כדי לנהל הזמנות, מעקבים וקיבולת.</p>
        <LoginForm />
      </div>
    </div>
  );
}
