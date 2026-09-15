import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card p-8 text-center">
        <h1 className="page-title">העמוד לא נמצא</h1>
        <p className="mt-2 text-[var(--ink-soft)]">ייתכן שההזמנה או האירוע אינם זמינים.</p>
        <Link className="btn btn-primary mt-4" href="/events">
          חזרה לאירועים
        </Link>
      </div>
    </div>
  );
}
