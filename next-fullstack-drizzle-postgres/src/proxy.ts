import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, ROUTES } from "@/constants/api";

export function proxy(request: NextRequest) {
  if (request.cookies.get(COOKIE.refresh)) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = ROUTES.login;
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
