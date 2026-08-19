import { auth } from "@/auth";

export default auth((request) => {
  if (request.auth) return;
  return Response.redirect(new URL("/login", request.url));
});

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
