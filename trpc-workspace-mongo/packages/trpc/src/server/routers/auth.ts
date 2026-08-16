import {
  forgotPassword,
  forgotPasswordInputSchema,
  forgotPasswordOutputSchema,
  login,
  loginInputSchema,
  loginOutputSchema,
  logout,
  refresh,
  refreshOutputSchema,
  register,
  registerInputSchema,
  registerOutputSchema,
  resetPassword,
  resetPasswordInputSchema,
  resetPasswordOutputSchema,
  verifyEmail,
  verifyEmailInputSchema,
  verifyEmailOutputSchema,
} from "@repo/services";
import { clearAuthCookies, setAuthCookies } from "../cookies";
import { COOKIE, getRefreshToken, getRequestMeta } from "../http";
import { zodUndefinedModel } from "../schema";
import { publicProcedure, rateLimitedProcedure, router } from "../trpc";

export const authRouter = router({
  register: rateLimitedProcedure
    .input(registerInputSchema)
    .output(registerOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await register(input, getRequestMeta(ctx.req));
      if (!result.tokens) {
        return {
          user: result.user,
          message: "Check your email to verify your account",
        };
      }
      setAuthCookies(ctx.res, result.tokens.accessToken, result.tokens.refreshToken);
      return { user: result.tokens.user };
    }),

  login: rateLimitedProcedure
    .input(loginInputSchema)
    .output(loginOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await login(input, getRequestMeta(ctx.req));
      setAuthCookies(ctx.res, result.accessToken, result.refreshToken);
      return { user: result.user };
    }),

  refresh: rateLimitedProcedure.output(refreshOutputSchema).mutation(async ({ ctx }) => {
    const result = await refresh(getRefreshToken(ctx.req), getRequestMeta(ctx.req));
    setAuthCookies(ctx.res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }),

  logout: publicProcedure.output(zodUndefinedModel).mutation(async ({ ctx }) => {
    const token = ctx.req.cookies?.[COOKIE.refresh] as string | undefined;
    await logout(token);
    clearAuthCookies(ctx.res);
  }),

  forgotPassword: rateLimitedProcedure
    .input(forgotPasswordInputSchema)
    .output(forgotPasswordOutputSchema)
    .mutation(async ({ input }) => {
      await forgotPassword(input.email);
      return { message: "If that email exists, a reset link has been sent" };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordInputSchema)
    .output(resetPasswordOutputSchema)
    .mutation(async ({ input }) => {
      await resetPassword(input);
      return { message: "Password updated. Sign in with your new password." };
    }),

  verifyEmail: publicProcedure
    .input(verifyEmailInputSchema)
    .output(verifyEmailOutputSchema)
    .mutation(async ({ input }) => {
      const user = await verifyEmail(input.token);
      return { user };
    }),
});
