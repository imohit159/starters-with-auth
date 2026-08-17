import type { Request, Response } from "express";
import { getMe } from "./users.service";

export async function me(req: Request, res: Response) {
  const user = await getMe(req.user!.id);
  res.json({ user });
}
