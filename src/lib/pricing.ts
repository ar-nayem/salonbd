import "server-only";
import { db } from "./db";
import { PUBLIC_SERVICE_WHERE } from "./constants";

export type LineInput = { serviceId: string; optionIds?: string[]; addonIds?: string[] };

export type PricedLine = {
  serviceId: string;
  name: string;
  price: number;
  durationMin: number;
  parts: { kind: "OPTION" | "ADDON"; id: string; name: string; price: number; durationMin: number }[];
};

export type PricedCart =
  | { ok: true; lines: PricedLine[]; subtotal: number; durationMin: number; serviceIds: string[] }
  | { ok: false; error: "SERVICE_UNAVAILABLE" | "OPTION_UNAVAILABLE" | "EMPTY" };

/**
 * Prices a cart from the database only. Nothing the client sends about money
 * or duration is trusted — it sends ids, the server decides the numbers.
 */
export async function priceCart(shopId: string, lines: LineInput[]): Promise<PricedCart> {
  if (lines.length === 0) return { ok: false, error: "EMPTY" };

  const serviceIds = lines.map((l) => l.serviceId);
  const services = await db.service.findMany({
    where: { id: { in: serviceIds }, shopId, ...PUBLIC_SERVICE_WHERE },
    include: {
      optionGroups: { include: { options: { where: { isActive: true } } } },
      addons: { where: { isActive: true } },
    },
  });
  if (services.length !== new Set(serviceIds).size) return { ok: false, error: "SERVICE_UNAVAILABLE" };

  const priced: PricedLine[] = [];

  for (const line of lines) {
    const service = services.find((s) => s.id === line.serviceId);
    if (!service) return { ok: false, error: "SERVICE_UNAVAILABLE" };

    const validOptions = service.optionGroups.flatMap((g) => g.options);
    const parts: PricedLine["parts"] = [];

    for (const optionId of line.optionIds ?? []) {
      const option = validOptions.find((o) => o.id === optionId);
      if (!option) return { ok: false, error: "OPTION_UNAVAILABLE" };
      parts.push({
        kind: "OPTION",
        id: option.id,
        name: option.name,
        price: option.priceDelta,
        durationMin: option.durationDelta,
      });
    }

    for (const addonId of line.addonIds ?? []) {
      const addon = service.addons.find((a) => a.id === addonId);
      if (!addon) return { ok: false, error: "OPTION_UNAVAILABLE" };
      parts.push({
        kind: "ADDON",
        id: addon.id,
        name: addon.name,
        price: addon.price,
        durationMin: addon.durationMin,
      });
    }

    // A discounted price replaces the base price; it never stacks with promos
    // at the line level, only at the cart level.
    const base =
      service.discountPrice !== null && service.discountPrice < service.price
        ? service.discountPrice
        : service.price;

    priced.push({
      serviceId: service.id,
      name: service.name,
      price: base + parts.reduce((sum, p) => sum + p.price, 0),
      durationMin: service.durationMin + parts.reduce((sum, p) => sum + p.durationMin, 0),
      parts,
    });
  }

  return {
    ok: true,
    lines: priced,
    subtotal: priced.reduce((sum, l) => sum + l.price, 0),
    durationMin: priced.reduce((sum, l) => sum + l.durationMin, 0),
    serviceIds: [...new Set(serviceIds)],
  };
}

/** Duration only — used by the availability endpoint before a booking exists. */
export async function cartDuration(shopId: string, lines: LineInput[]): Promise<number> {
  const priced = await priceCart(shopId, lines);
  return priced.ok ? priced.durationMin : 0;
}
