import type { JwtPayload } from "jsonwebtoken";

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  email: string;
};
