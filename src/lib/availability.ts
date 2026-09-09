import "server-only";
import { db } from "./db";
import { nowMinutes, todayISO, weekdayOf } from "./utils";

export type Interval = { start: number; end: number };

export type Resource = {
  /** null means "the shop itself" — used when a shop has no staff records. */
  staffId: string | null;
  name: string;
  open: Interval[];
  busy: Interval[];
};

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

function subtract(open: Interval[], busy: Interval[]): Interval[] {
  let free = [...open];
  for (const b of busy) {
    const next: Interval[] = [];
    for (const f of free) {
      if (!overlaps(f, b)) {
        next.push(f);
        continue;
      }
      if (b.start > f.start) next.push({ start: f.start, end: b.start });
      if (b.end < f.end) next.push({ start: b.end, end: f.end });
    }
    free = next;
  }
  return free.filter((i) => i.end > i.start);
}

/**
 * Resources that can perform every service in `serviceIds` on `date`,
 * with their open windows and already-taken intervals.
 */
export async function getResources(
  shopId: string,
  date: string,
  serviceIds: string[],
): Promise<{ resources: Resource[]; stepMin: number }> {
  const weekday = weekdayOf(date);

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      slotStepMin: true,
      hours: { where: { weekday } },
      closures: { where: { date } },
      staff: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          hours: { where: { weekday } },
          closures: { where: { date } },
          services: { select: { serviceId: true } },
        },
        orderBy: { sort: "asc" },
      },
    },
  });
  if (!shop) return { resources: [], stepMin: 15 };

  const shopOpen: Interval[] = shop.hours
    .filter((h) => !h.isClosed && h.closeMin > h.openMin)
    .map((h) => ({ start: h.openMin, end: h.closeMin }));

  const shopClosures: Interval[] = shop.closures.map((c) => ({
    start: c.startMin ?? 0,
    end: c.endMin ?? 1440,
  }));

  const bookings = await db.booking.findMany({
    where: { shopId, date, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { staffId: true, startMin: true, endMin: true },
  });

  // A shop with no staff rows behaves as one bookable resource.
  const capable = shop.staff.filter((s) => {
    if (serviceIds.length === 0) return true;
    const own = new Set(s.services.map((x) => x.serviceId));
    // No explicit mapping means the barber does everything the shop offers.
    if (own.size === 0) return true;
    return serviceIds.every((id) => own.has(id));
  });

  if (capable.length === 0) {
    const busy = bookings.map((b) => ({ start: b.startMin, end: b.endMin }));
    return {
      stepMin: shop.slotStepMin,
      resources: [
        {
          staffId: null,
          name: "",
          open: subtract(shopOpen, shopClosures),
          busy,
        },
      ],
    };
  }

  const resources: Resource[] = capable.map((s) => {
    const own = s.hours.filter((h) => !h.isClosed && h.closeMin > h.openMin);
    const staffHasOverride = s.hours.length > 0;
    const open = staffHasOverride
      ? own.map((h) => ({ start: h.openMin, end: h.closeMin }))
      : shopOpen;

    const closures = [
      ...shopClosures,
      ...s.closures.map((c) => ({ start: c.startMin ?? 0, end: c.endMin ?? 1440 })),
    ];

    const busy = bookings
      .filter((b) => b.staffId === s.id || b.staffId === null)
      .map((b) => ({ start: b.startMin, end: b.endMin }));

    return { staffId: s.id, name: s.name, open: subtract(open, closures), busy };
  });

  return { resources, stepMin: shop.slotStepMin };
}

export type Slot = { startMin: number; staffIds: (string | null)[] };

/** Free start times on `date` that fit `durationMin`, across all capable resources. */
export async function getSlots(opts: {
  shopId: string;
  date: string;
  serviceIds: string[];
  durationMin: number;
  staffId?: string | null;
  /** minutes of lead time required before the next bookable slot */
  leadMin?: number;
}): Promise<Slot[]> {
  const { shopId, date, serviceIds, durationMin } = opts;
  if (durationMin <= 0) return [];

  const { resources, stepMin } = await getResources(shopId, date, serviceIds);
  const pool = opts.staffId ? resources.filter((r) => r.staffId === opts.staffId) : resources;
  if (pool.length === 0) return [];

  const isToday = date === todayISO();
  const earliest = isToday ? nowMinutes() + (opts.leadMin ?? 30) : 0;

  const byStart = new Map<number, (string | null)[]>();

  for (const r of pool) {
    const free = subtract(r.open, r.busy);
    for (const window of free) {
      const first = Math.ceil(Math.max(window.start, earliest) / stepMin) * stepMin;
      for (let s = first; s + durationMin <= window.end; s += stepMin) {
        const list = byStart.get(s) ?? [];
        list.push(r.staffId);
        byStart.set(s, list);
      }
    }
  }

  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startMin, staffIds]) => ({ startMin, staffIds }));
}

/** Re-checks a specific slot at write time. Returns the staff to assign, or null if taken. */
export async function resolveSlot(opts: {
  shopId: string;
  date: string;
  serviceIds: string[];
  durationMin: number;
  startMin: number;
  staffId?: string | null;
}): Promise<{ ok: true; staffId: string | null } | { ok: false; reason: string }> {
  const slots = await getSlots(opts);
  const match = slots.find((s) => s.startMin === opts.startMin);
  if (!match) return { ok: false, reason: "SLOT_TAKEN" };
  if (opts.staffId) {
    return match.staffIds.includes(opts.staffId)
      ? { ok: true, staffId: opts.staffId }
      : { ok: false, reason: "SLOT_TAKEN" };
  }
  return { ok: true, staffId: match.staffIds[0] ?? null };
}

export function isOpenNow(hours: { weekday: number; openMin: number; closeMin: number; isClosed: boolean }[]) {
  const today = weekdayOf(todayISO());
  const now = nowMinutes();
  return hours.some(
    (h) => h.weekday === today && !h.isClosed && now >= h.openMin && now < h.closeMin,
  );
}
