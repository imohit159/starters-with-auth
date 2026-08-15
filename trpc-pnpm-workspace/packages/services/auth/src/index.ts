export { env, type AuthEnv } from "./env";
export {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  newFamilyId,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "./crypto";
export { sendMail, type MailMessage } from "./mailer";
export { getGoogleOAuthClient, GOOGLE_SCOPES } from "./google-oauth-client";
export {
  forgotPasswordDto,
  loginDto,
  registerDto,
  resetPasswordDto,
  verifyEmailDto,
  type ForgotPasswordDto,
  type LoginDto,
  type RegisterDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
} from "./auth.dto";
export {
  consumeChallengeOnce,
  decideGoogleAuth,
  decidePasswordRegister,
  forgotPassword,
  googleCallback,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  startGoogleAuth,
  verifyEmail,
  type GoogleAuthDecision,
  type PasswordRegisterDecision,
} from "./auth.service";
