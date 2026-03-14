import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/maintenance", "/leagues", "/clubs", "/players", "/calendar", "/articles", "/matches", "/stats"];
const ADMIN_PATHS = ["/admin"];
const OFFICIAL_PATHS = ["/official"];
const TEAM_PATHS = ["/team"];
const PLAYER_PATHS = ["/player"];
const DASHBOARD_PATHS = [...ADMIN_PATHS, ...OFFICIAL_PATHS, ...TEAM_PATHS, ...PLAYER_PATHS];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check session cookie for auth state
  const sessionCookie = request.cookies.get("session")?.value;

  // Maintenance mode check (read from a request header set by edge config, or skip if not configured)
  const maintenanceMode = request.headers.get("x-maintenance-mode") === "true";
  if (maintenanceMode && pathname !== "/maintenance") {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }
  if (pathname === "/maintenance" && !maintenanceMode) {
    return NextResponse.redirect(new URL("/", request.url));
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
