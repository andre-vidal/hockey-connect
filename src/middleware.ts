import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATHS = ["/admin"];
const OFFICIAL_PATHS = ["/official"];
const TEAM_PATHS = ["/team"];
const PLAYER_PATHS = ["/player"];
const DASHBOARD_PATHS = [...ADMIN_PATHS, ...OFFICIAL_PATHS, ...TEAM_PATHS, ...PLAYER_PATHS];

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check session cookie for auth state
  const sessionCookie = request.cookies.get("session")?.value;

  // Maintenance mode check — only active when x-maintenance-mode header is explicitly set
  // (e.g. by Vercel Edge Config). When the header is absent, MaintenanceProvider handles
  // maintenance mode client-side via RTDB, so the middleware must not interfere.
  const maintenanceModeHeader = request.headers.get("x-maintenance-mode");
  if (maintenanceModeHeader !== null) {
    const maintenanceMode = maintenanceModeHeader === "true";
    if (maintenanceMode && pathname !== "/maintenance") {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
    if (pathname === "/maintenance" && !maintenanceMode) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirect unauthenticated users trying to access dashboard
  if (isDashboardPath(pathname) && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === "/login" || pathname === "/register") && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
