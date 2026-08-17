import type { Request, Response } from "express";
import * as adminService from "./admin.service";
import type {
  AdminGrantAccessInputSchema,
  AdminRevokeAccessInputSchema,
  AdminSearchUsersInputSchema,
  AdminUserIdInputSchema,
} from "./model";

export async function search(req: Request, res: Response) {
  const input = req.body as AdminSearchUsersInputSchema;
  const result = await adminService.searchUsers(req.user!.id, input);
  res.json(result);
}

export async function getUser(req: Request, res: Response) {
  const input = req.body as AdminUserIdInputSchema;
  const result = await adminService.getUserDetail(req.user!.id, input.userId);
  res.json(result);
}

export async function grant(req: Request, res: Response) {
  const result = await adminService.grantOrgAccess(req.user!.id, req.body as AdminGrantAccessInputSchema);
  res.json({ subscription: result });
}

export async function revoke(req: Request, res: Response) {
  const input = req.body as AdminRevokeAccessInputSchema;
  const result = await adminService.revokeOrgAccess(req.user!.id, input.organizationId);
  res.json({ subscription: result });
}
