import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiHandler } from "@/server/http/handler";

export const GET = apiHandler(async () => {
  await db.execute(sql`select 1`);
  return NextResponse.json({ status: "ok" });
});
