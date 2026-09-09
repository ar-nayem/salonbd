import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/tenancy";
import { PAID_WHERE } from "@/lib/analytics";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  // Gated on the admin role, not on being logged out.
  if (!user || !isAdmin(user.role)) return new Response("Not found", { status: 404 });

  const users = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, email: true, createdAt: true, dateOfBirth: true },
  });

  const spend = await db.booking.groupBy({
    by: ["customerId"],
    where: PAID_WHERE,
    _sum: { total: true },
    _count: true,
    _max: { date: true },
  });

  const rows = users.map((u) => {
    const stats = spend.find((s) => s.customerId === u.id);
    const total = stats?._sum.total ?? 0;
    const count = stats?._count ?? 0;
    return [
      u.name,
      u.phone ?? "",
      u.email ?? "",
      count,
      total,
      count > 0 ? Math.round(total / count) : 0,
      stats?._max.date ?? "",
      u.createdAt.toISOString().slice(0, 10),
      u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : "",
    ];
  });

  const csv = toCsv(
    ["Name", "Phone", "Email", "Bookings", "Total spend", "Average booking", "Last booking", "Joined", "Date of birth"],
    rows,
  );
  return csvResponse(`salonbd-customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
