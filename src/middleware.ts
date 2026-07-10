import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// This runs on the Edge for every matched request, BEFORE any page or layout
// code executes. It's a hard gate independent of getServerSession() calls
// inside layouts — so even if a page were ever accidentally cached or a
// layout check got bypassed, this still blocks unauthenticated access.
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
