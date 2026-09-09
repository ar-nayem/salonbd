import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser, type CurrentUser } from "./auth";
import type { Role } from "@prisma/client";

export const SHOP_ROLES: Role[] = ["OWNER", "STAFF"];
export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function isAdmin(role: Role) {
  return ADMIN_ROLES.includes(role);
}

/**
 * Every shop id the caller may act on, resolved from their session. A shop id
 * arriving in a request body is never trusted on its own — it is intersected
 * with this list.
 */
export async function callerShopIds(user: CurrentUser): Promise<string[]> {
  if (isAdmin(user.role)) return [];

  const [owned, memberships] = await Promise.all([
    db.shop.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    db.shopMember.findMany({ where: { userId: user.id }, select: { shopId: true } }),
  ]);
  return [...new Set([...owned.map((s) => s.id), ...memberships.map((m) => m.shopId)])];
}

export type ShopAccess = { user: CurrentUser; shopId: string; isAdmin: boolean };

/**
 * Page-level guard. A member of another shop is sent to 404 rather than 403 —
 * a 403 confirms the record exists.
 */
export async function requireShopPage(shopId?: string): Promise<ShopAccess> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  if (isAdmin(user.role)) {
    const shop = shopId
      ? await db.shop.findUnique({ where: { id: shopId }, select: { id: true } })
      : await db.shop.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!shop) redirect("/dashboard/new");
    return { user, shopId: shop.id, isAdmin: true };
  }

  const ids = await callerShopIds(user);
  if (ids.length === 0) redirect("/dashboard/new");
  if (shopId && !ids.includes(shopId)) notFound();

  return { user, shopId: shopId ?? ids[0], isAdmin: false };
}

export class TenantError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "NOT_FOUND") {
    super(code);
  }
}

/** API-level guard. Throws NOT_FOUND for a valid session on the wrong tenant. */
export async function requireShopApi(shopId: string): Promise<ShopAccess> {
  const user = await getCurrentUser();
  if (!user) throw new TenantError("UNAUTHENTICATED");
  if (isAdmin(user.role)) return { user, shopId, isAdmin: true };

  const ids = await callerShopIds(user);
  if (!ids.includes(shopId)) throw new TenantError("NOT_FOUND");
  return { user, shopId, isAdmin: false };
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user.role)) notFound();
  return user;
}
