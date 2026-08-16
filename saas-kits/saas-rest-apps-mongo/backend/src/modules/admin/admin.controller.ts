import type { Request, Response } from "express";
import { getUserDetail, grantOrgAccess, revokeOrgAccess, searchUsers } from "./admin.service";
import { routeParam } from "../../shared/http";

export async function search(req: Request, res: Response) {
  const result = await searchUsers(req.user!.id, { email: String(req.query.email ?? "") });
  res.json(result);
}

export async function getUser(req: Request, res: Response) {
  const result = await getUserDetail(req.user!.id, routeParam(req, "userId"));
  res.json(result);
}

export async function grant(req: Request, res: Response) {
  const result = await grantOrgAccess(req.user!.id, {
    organizationId: routeParam(req, "organizationId"),
    days: req.body.days,
  });
  res.json(result);
}

export async function revoke(req: Request, res: Response) {
  const result = await revokeOrgAccess(req.user!.id, routeParam(req, "organizationId"));
  res.json(result);
}
