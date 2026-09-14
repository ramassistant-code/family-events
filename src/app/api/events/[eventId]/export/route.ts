import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/access";
import { invitationsToExcelBuffer } from "@/lib/export";
import { canExportInvitations } from "@/lib/permissions";
import { listInvitations } from "@/lib/queries";
import type { InvitationStatus, InvitingSide } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const { role, event } = await requireEventAccess(eventId);
  if (!canExportInvitations(role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const side = url.searchParams.get("side") || "";
  const followUp = url.searchParams.get("followUp") || "";
  const query = url.searchParams.get("q") || "";

  const rows = await listInvitations(eventId, {
    query,
    status: status as InvitationStatus | "",
    side: side as InvitingSide | "",
    followUp: followUp as "today" | "overdue" | "",
  });

  const buffer = await invitationsToExcelBuffer(rows);
  const filename = `invitations-${event.name}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
