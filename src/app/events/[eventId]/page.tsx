import { redirect } from "next/navigation";

export default async function EventIndex({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/dashboard`);
}
