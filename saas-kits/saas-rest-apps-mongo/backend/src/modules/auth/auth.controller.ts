import type { Request, Response } from "express";
import { env } from "../../config/env";
import {
  forgotPassword as requestPasswordReset,
  googleCallback as completeGoogleAuth,
  login as loginUser,
  logout as logoutUser,
  refresh as refreshSession,
  register as registerUser,
  resetPassword as completePasswordReset,
  startGoogleAuth,
  verifyEmail as confirmEmail,
} from "./auth.service";
import type {
  ForgotPasswordInputSchema,
  LoginInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  VerifyEmailInputSchema,
} from "./model";
import { clearAuthCookies, setAuthCookies } from "../../shared/middleware/cookies";
import { getRefreshToken, getRequestMeta } from "../../shared/middleware/require-auth";

function respondWithSession(
  res: Response,
  payload: { accessToken: string; refreshToken: string; user: unknown },
  status = 200,
) {
  setAuthCookies(res, payload.accessToken, payload.refreshToken);
  res.status(status).json({ user: payload.user });
}

export async function register(req: Request, res: Response) {
  const result = await registerUser(req.body as RegisterInputSchema, getRequestMeta(req));
  if (!result.tokens) {
    res.status(201).json({
      user: result.user,
      message: "Check your email to verify your account",
    });
    return;
  }
  respondWithSession(res, result.tokens, 201);
}

export async function login(req: Request, res: Response) {
  const result = await loginUser(req.body as LoginInputSchema, getRequestMeta(req));
  respondWithSession(res, result);
}

export async function refresh(req: Request, res: Response) {
  const result = await refreshSession(getRefreshToken(req), getRequestMeta(req));
  respondWithSession(res, result);
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.refresh_token as string | undefined;
  await logoutUser(token);
  clearAuthCookies(res);
  res.status(204).send();
}

export async function googleStart(_req: Request, res: Response) {
  const url = await startGoogleAuth();
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response) {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const result = await completeGoogleAuth(code, state, getRequestMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.redirect(`${env.WEB_ORIGIN}/auth/callback`);
}

export async function forgotPassword(req: Request, res: Response) {
  const body = req.body as ForgotPasswordInputSchema;
  await requestPasswordReset(body.email);
  res.json({ message: "If that email exists, a reset link has been sent" });
}

export async function resetPassword(req: Request, res: Response) {
  await completePasswordReset(req.body as ResetPasswordInputSchema);
  res.json({ message: "Password updated. Sign in with your new password." });
}

export async function verifyEmail(req: Request, res: Response) {
  const body = req.body as VerifyEmailInputSchema;
  const user = await confirmEmail(body.token);
  res.json({ user });
}
