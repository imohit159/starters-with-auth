import type { Request, Response } from "express";
import * as usersService from "./users.service";

export async function me(req: Request, res: Response) {
  const user = await usersService.getMe(req.user!.id);
  res.json({ user });
}
