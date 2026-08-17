import { NextResponse } from "next/server";
import { listSessions, revokeOtherSessions } from "@/server/modules/auth";
import { getMe } from "@/server/modules/users";
import { apiHandler } from "./handler";
import { getAuthenticatedUser, getRefreshTokenOptional } from "./request";

export const meHandler = apiHandler(async (request) => {
  const identity = getAuthenticatedUser(request);
  return NextResponse.json({ user: await getMe(identity.sub) });
});

export const listSessionsHandler = apiHandler(async (request) => {
  const identity = getAuthenticatedUser(request);
  const sessions = await listSessions(identity.sub, getRefreshTokenOptional(request));
  return NextResponse.json({ sessions });
});

/** Signs the account out everywhere except the device making the request. */
export const revokeOtherSessionsHandler = apiHandler(async (request) => {
  const identity = getAuthenticatedUser(request);
  const revoked = await revokeOtherSessions(identity.sub, getRefreshTokenOptional(request));
  return NextResponse.json({ revoked });
});
