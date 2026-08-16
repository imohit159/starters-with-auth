import { NextResponse } from "next/server";
import {
  forgotPassword,
  forgotPasswordInputSchema,
  googleCallback,
  login,
  loginInputSchema,
  logout,
  refresh,
  register,
  registerInputSchema,
  resetPassword,
  resetPasswordInputSchema,
  startGoogleAuth,
  verifyEmail,
  verifyEmailInputSchema,
} from "@/server/modules/auth";
import { env } from "@/server/env";
import { clearAuthCookies, setAuthCookies } from "./cookies";
import { apiHandler } from "./handler";
import { enforceAuthRateLimit, setRateLimitHeaders } from "./rate-limit";
import { getRefreshToken, getRequestMeta } from "./request";

function sessionResponse(
  payload: { accessToken: string; refreshToken: string; user: unknown },
  status = 200,
) {
  const response = NextResponse.json({ user: payload.user }, { status });
  setAuthCookies(response, payload.accessToken, payload.refreshToken);
  return response;
}

export const registerHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "register");
  const input = registerInputSchema.parse(await request.json());
  const result = await register(input, getRequestMeta(request));
  if (!result.tokens) {
    return setRateLimitHeaders(NextResponse.json(
      { user: result.user, message: "Check your email to verify your account" },
      { status: 201 },
    ), rateLimit);
  }
  return setRateLimitHeaders(sessionResponse(result.tokens, 201), rateLimit);
});

export const loginHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "login");
  const input = loginInputSchema.parse(await request.json());
  return setRateLimitHeaders(sessionResponse(await login(input, getRequestMeta(request))), rateLimit);
});

export const refreshHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "refresh");
  return setRateLimitHeaders(
    sessionResponse(await refresh(getRefreshToken(request), getRequestMeta(request))),
    rateLimit,
  );
});

export const logoutHandler = apiHandler(async (request) => {
  await logout(request.cookies.get("refresh_token")?.value);
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
});

export const googleStartHandler = apiHandler(async () => NextResponse.redirect(await startGoogleAuth()));

export const googleCallbackHandler = apiHandler(async (request) => {
  const result = await googleCallback(
    request.nextUrl.searchParams.get("code") ?? undefined,
    request.nextUrl.searchParams.get("state") ?? undefined,
    getRequestMeta(request),
  );
  const response = NextResponse.redirect(`${env.APP_URL}/auth/callback`);
  setAuthCookies(response, result.accessToken, result.refreshToken);
  return response;
});

export const forgotPasswordHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "forgot-password");
  const input = forgotPasswordInputSchema.parse(await request.json());
  await forgotPassword(input.email);
  return setRateLimitHeaders(
    NextResponse.json({ message: "If that email exists, a reset link has been sent" }),
    rateLimit,
  );
});

export const resetPasswordHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "reset-password");
  const input = resetPasswordInputSchema.parse(await request.json());
  await resetPassword(input);
  return setRateLimitHeaders(
    NextResponse.json({ message: "Password updated. Sign in with your new password." }),
    rateLimit,
  );
});

export const verifyEmailHandler = apiHandler(async (request) => {
  const input = verifyEmailInputSchema.parse(await request.json());
  return NextResponse.json({ user: await verifyEmail(input.token) });
});
