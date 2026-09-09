import type { Prisma } from "@prisma/client";

/// The one commission number. Every view, chart and export reads this, and a
/// shop-specific rate overrides it only through Shop.commissionRate.
export const DEFAULT_COMMISSION_RATE = 0.1;

/// A shop is browsable only when the platform has it live AND the owner has
/// not temporarily hidden it.
export const PUBLIC_SHOP_WHERE = {
  status: "ACTIVE",
  isActive: true,
} satisfies Prisma.ShopWhereInput;

/// Services a buyer may see and book.
export const PUBLIC_SERVICE_WHERE = {
  status: "AVAILABLE",
} satisfies Prisma.ServiceWhereInput;

/// Home service is modelled end to end but not exposed. Flip this on only
/// once the travel-time and address flows exist.
export const FEATURE_HOME_SERVICE = false;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"] as const;

export const REVIEW_TAGS = [
  "clean-shop",
  "on-time",
  "friendly",
  "good-value",
  "skilled-barber",
  "long-wait",
  "ac-comfort",
] as const;
