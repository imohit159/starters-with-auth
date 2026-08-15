import { z } from "zod";

export const registerDto = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).trim(),
});

export const loginDto = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
});

export const forgotPasswordDto = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
});

export const resetPasswordDto = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const verifyEmailDto = z.object({
  token: z.string().min(1),
});

export type RegisterDto = z.infer<typeof registerDto>;
export type LoginDto = z.infer<typeof loginDto>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDto>;
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;
export type VerifyEmailDto = z.infer<typeof verifyEmailDto>;
