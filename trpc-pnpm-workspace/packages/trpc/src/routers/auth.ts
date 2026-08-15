import { z } from "zod";
import {
  forgotPassword,
  forgotPasswordDto,
  login,
  loginDto,
  logout,
  refresh,
  register,
  registerDto,
  resetPassword,
  resetPasswordDto,
  verifyEmail,
  verifyEmailDto,
} from "@repo/auth";
import { clearAuthCookies, setAuthCookies } from "../cookies";
import { COOKIE, getRefreshToken, getRequestMeta } from "../http";
import { publicProcedure, rateLimitedProcedure, router } from "../trpc";

const emptyInput = z.object({}).optional();

export const authRouter = router({
  register: rateLimitedProcedure.input(registerDto).mutation(async ({ ctx, input }) => {
    const result = await register(input, getRequestMeta(ctx.req));
    if (!result.tokens) {
      return {
        user: result.user,
        message: "Check your email to verify your account" as string | undefined,
      };
    }
    setAuthCookies(ctx.res, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.tokens.user, message: undefined };
  }),

  login: rateLimitedProcedure.input(loginDto).mutation(async ({ ctx, input }) => {
    const result = await login(input, getRequestMeta(ctx.req));
    setAuthCookies(ctx.res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }),

  refresh: rateLimitedProcedure.input(emptyInput).mutation(async ({ ctx }) => {
    const result = await refresh(getRefreshToken(ctx.req), getRequestMeta(ctx.req));
    setAuthCookies(ctx.res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }),

  logout: publicProcedure.input(emptyInput).mutation(async ({ ctx }) => {
    const token = ctx.req.cookies?.[COOKIE.refresh] as string | undefined;
    await logout(token);
    clearAuthCookies(ctx.res);
  }),

  forgotPassword: rateLimitedProcedure.input(forgotPasswordDto).mutation(async ({ input }) => {
    await forgotPassword(input.email);
    return { message: "If that email exists, a reset link has been sent" };
  }),

  resetPassword: publicProcedure.input(resetPasswordDto).mutation(async ({ input }) => {
    await resetPassword(input);
    return { message: "Password updated. Sign in with your new password." };
  }),

  verifyEmail: publicProcedure.input(verifyEmailDto).mutation(async ({ input }) => {
    const user = await verifyEmail(input.token);
    return { user };
  }),
});
