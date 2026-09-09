import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * First line of defence on the shop and admin trees. The session cookie is
 * signature-checked here so an unauthenticated request never reaches a page,
 * but the authoritative checks still run server-side in the layouts and
 * actions — this only reads the role claim, it cannot read the database.
 */
const SHOP_ROLES = ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sb_session")?.value;

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);

  if (!token) return NextResponse.redirect(loginUrl);

  let role: string | undefined;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    role = payload.role as string;
  } catch {
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !ADMIN_ROLES.includes(role ?? "")) {
    // Same answer a stranger gets for a path that does not exist. The admin
    // layout repeats this check server-side.
    return new NextResponse(null, { status: 404 });
  }
  if (pathname.startsWith("/dashboard") && !SHOP_ROLES.includes(role ?? "")) {
    // A customer who is registering a shop still needs the sign-up screen.
    if (pathname !== "/dashboard/new") {
      return NextResponse.redirect(new URL("/dashboard/new", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
