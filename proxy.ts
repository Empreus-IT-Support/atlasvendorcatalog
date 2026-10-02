import { NextResponse, type NextRequest } from "next/server";

// HTTP Basic gate for the admin pages (password = SCRAPE_SECRET). /api/* uses Bearer auth in the routes.
export function proxy(req: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return NextResponse.next(); // local dev without a secret
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const [, pass] = atob(header.slice(6)).split(/:(.*)/s);
    if (pass === secret) return NextResponse.next();
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Vendor catalog"' } });
}

export const config = { matcher: ["/((?!api|_next|favicon.ico).*)"] };
