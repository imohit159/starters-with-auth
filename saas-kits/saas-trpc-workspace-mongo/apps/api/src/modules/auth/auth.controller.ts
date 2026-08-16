import type { Request, Response } from "express";
import { env, googleCallback as completeGoogleAuth, startGoogleAuth } from "@repo/services";
import { getRequestMeta, setAuthCookies } from "@repo/trpc/server";

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
