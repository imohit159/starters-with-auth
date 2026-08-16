import { NextResponse } from "next/server";
import { getMe } from "@/server/modules/users";
import { apiHandler } from "./handler";
import { getAuthenticatedUser } from "./request";

export const meHandler = apiHandler(async (request) => {
  const identity = getAuthenticatedUser(request);
  return NextResponse.json({ user: await getMe(identity.sub) });
});
