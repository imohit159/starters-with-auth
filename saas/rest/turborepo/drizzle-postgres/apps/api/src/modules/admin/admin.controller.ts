import type { Request, Response } from "express";
import {
  getUserDetail,
  grantOrgAccess,
  revokeOrgAccess,
  searchUsers,
  type AdminGrantAccessInputSchema,
  type AdminRevokeAccessInputSchema,
  type AdminSearchUsersInputSchema,
  type AdminUserIdInputSchema,
} from "@repo/services";

export async function search(req: Request, res: Response) {
  const input = req.body as AdminSearchUsersInputSchema;
  const result = await searchUsers(req.user!.id, input);
  res.json(result);
}

export async function getUser(req: Request, res: Response) {
  const input = req.body as AdminUserIdInputSchema;
  const result = await getUserDetail(req.user!.id, input.userId);
  res.json(result);
}

export async function grant(req: Request, res: Response) {
  const result = await grantOrgAccess(req.user!.id, req.body as AdminGrantAccessInputSchema);
  res.json({ subscription: result });
}

export async function revoke(req: Request, res: Response) {
  const input = req.body as AdminRevokeAccessInputSchema;
  const result = await revokeOrgAccess(req.user!.id, input.organizationId);
  res.json({ subscription: result });
}
