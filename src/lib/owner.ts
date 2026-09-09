import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser } from "./auth";

/** The signed-in owner's shop id, or a redirect if they have none. */
export async function requireOwnerShopId(): Promise<{ shopId: string; userId: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role === "CUSTOMER") redirect("/dashboard/new");

  const shop = await db.shop.findFirst({
    where: user.role === "ADMIN" ? {} : { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!shop) redirect("/dashboard/new");
  return { shopId: shop.id, userId: user.id };
}
