import { type NextRequest, NextResponse } from "next/server";

// Temporary: pass-through so the site loads.
// Auth redirects will be added back after the app is stable.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
