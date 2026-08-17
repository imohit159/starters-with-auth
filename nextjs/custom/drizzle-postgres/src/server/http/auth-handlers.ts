import { NextResponse } from "next/server";
import {
  changePassword,
  changePasswordInputSchema,
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
  type SessionTokens,
} from "@/server/modules/auth";
import { env } from "@/server/env";
import { clearAuthCookies, setAuthCookies } from "./cookies";
import { apiHandler } from "./handler";
import {
  enforceAuthRateLimit,
  enforceSubjectRateLimit,
  setRateLimitHeaders,
  tightestLimit,
} from "./rate-limit";
import { getAuthenticatedUser, getRefreshToken, getRefreshTokenOptional, getRequestMeta } from "./request";

function sessionResponse(payload: SessionTokens, status = 200) {
  const response = NextResponse.json({ user: payload.user }, { status });
  setAuthCookies(response, payload.accessToken, payload.refreshToken);
  return response;
}

export const registerHandler = apiHandler(async (request) => {
  const ipLimit = await enforceAuthRateLimit(request, "register");
  const input = registerInputSchema.parse(await request.json());
  const subjectLimit = await enforceSubjectRateLimit(input.email, "register");
  const limit = tightestLimit(ipLimit, subjectLimit);

  const result = await register(input, getRequestMeta(request));

  if (result.status === "password_setup_sent") {
    return setRateLimitHeaders(
      NextResponse.json(
        { user: null, message: "Check your email to finish setting up this account" },
        { status: 202 },
      ),
      limit,
    );
  }

  if (result.status === "verification_sent") {
    return setRateLimitHeaders(
      NextResponse.json(
        { user: result.user, message: "Check your email to verify your account" },
        { status: 201 },
      ),
      limit,
    );
  }

  return setRateLimitHeaders(sessionResponse(result.tokens, 201), limit);
});

export const loginHandler = apiHandler(async (request) => {
  const ipLimit = await enforceAuthRateLimit(request, "login");
  const input = loginInputSchema.parse(await request.json());
  const subjectLimit = await enforceSubjectRateLimit(input.email, "login");
  return setRateLimitHeaders(
    sessionResponse(await login(input, getRequestMeta(request))),
    tightestLimit(ipLimit, subjectLimit),
  );
});

export const refreshHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "refresh");
  return setRateLimitHeaders(
    sessionResponse(await refresh(getRefreshToken(request), getRequestMeta(request))),
    rateLimit,
  );
});

export const logoutHandler = apiHandler(async (request) => {
  await enforceAuthRateLimit(request, "logout");
  await logout(getRefreshTokenOptional(request));
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
});

export const changePasswordHandler = apiHandler(async (request) => {
  const identity = getAuthenticatedUser(request);
  const ipLimit = await enforceAuthRateLimit(request, "change-password");
  const input = changePasswordInputSchema.parse(await request.json());
  const subjectLimit = await enforceSubjectRateLimit(identity.sub, "change-password");
  const tokens = await changePassword(identity.sub, input, getRequestMeta(request));
  return setRateLimitHeaders(sessionResponse(tokens), tightestLimit(ipLimit, subjectLimit));
});

export const googleStartHandler = apiHandler(async (request) => {
  await enforceAuthRateLimit(request, "google-start");
  return NextResponse.redirect(await startGoogleAuth());
});

export const googleCallbackHandler = apiHandler(async (request) => {
  await enforceAuthRateLimit(request, "google-callback");
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
  const ipLimit = await enforceAuthRateLimit(request, "forgot-password");
  const input = forgotPasswordInputSchema.parse(await request.json());
  const subjectLimit = await enforceSubjectRateLimit(input.email, "forgot-password");
  await forgotPassword(input.email);
  return setRateLimitHeaders(
    NextResponse.json({ message: "If that email exists, a reset link has been sent" }),
    tightestLimit(ipLimit, subjectLimit),
  );
});

export const resetPasswordHandler = apiHandler(async (request) => {
  const ipLimit = await enforceAuthRateLimit(request, "reset-password");
  const input = resetPasswordInputSchema.parse(await request.json());
  await resetPassword(input);
  const response = NextResponse.json({
    message: "Password updated. Sign in with your new password.",
  });
  // Every session was revoked, so drop this browser's stale cookies too.
  clearAuthCookies(response);
  return setRateLimitHeaders(response, ipLimit);
});

export const verifyEmailHandler = apiHandler(async (request) => {
  const rateLimit = await enforceAuthRateLimit(request, "verify-email");
  const input = verifyEmailInputSchema.parse(await request.json());
  return setRateLimitHeaders(NextResponse.json({ user: await verifyEmail(input.token) }), rateLimit);
});
