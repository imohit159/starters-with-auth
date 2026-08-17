import { z } from "zod";
import { userOutputSchema } from "../users/model";

const emailSchema = z.email().transform((value) => value.toLowerCase().trim());
const passwordSchema = z.string().min(8).max(128);

export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(80).trim(),
});
export type RegisterInputSchema = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInputSchema = z.infer<typeof loginInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInputSchema = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInputSchema = z.infer<typeof resetPasswordInputSchema>;

export const verifyEmailInputSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInputSchema = z.infer<typeof verifyEmailInputSchema>;

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "Choose a password you have not used here before",
  });
export type ChangePasswordInputSchema = z.infer<typeof changePasswordInputSchema>;

export const registerOutputSchema = z.object({
  user: userOutputSchema.nullable(),
  message: z.string().optional(),
});
export type RegisterOutputSchema = z.infer<typeof registerOutputSchema>;

export const loginOutputSchema = z.object({
  user: userOutputSchema,
});
export type LoginOutputSchema = z.infer<typeof loginOutputSchema>;

export const refreshOutputSchema = loginOutputSchema;
export type RefreshOutputSchema = LoginOutputSchema;

export const logoutOutputSchema = z.undefined();
export type LogoutOutputSchema = z.infer<typeof logoutOutputSchema>;

export const forgotPasswordOutputSchema = z.object({
  message: z.string(),
});
export type ForgotPasswordOutputSchema = z.infer<typeof forgotPasswordOutputSchema>;

export const resetPasswordOutputSchema = z.object({
  message: z.string(),
});
export type ResetPasswordOutputSchema = z.infer<typeof resetPasswordOutputSchema>;

export const verifyEmailOutputSchema = loginOutputSchema;
export type VerifyEmailOutputSchema = LoginOutputSchema;

export const sessionOutputSchema = z.object({
  id: z.string(),
  current: z.boolean(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string(),
});
export type SessionOutputSchema = z.infer<typeof sessionOutputSchema>;

export const sessionListOutputSchema = z.object({
  sessions: z.array(sessionOutputSchema),
});
export type SessionListOutputSchema = z.infer<typeof sessionListOutputSchema>;
