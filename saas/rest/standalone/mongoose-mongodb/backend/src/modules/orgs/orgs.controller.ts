import type { Request, Response } from "express";
import {
  acceptInvite,
  createOrganization,
  getOrganization,
  inviteMember,
  listMembers,
  listOrganizations,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from "./orgs.service";
import type {
  AcceptInviteInputSchema,
  CreateOrganizationInputSchema,
  InviteMemberInputSchema,
  RemoveMemberInputSchema,
  RevokeInviteInputSchema,
  UpdateMemberRoleInputSchema,
} from "./model";
import { routeParam } from "../../shared/http";

export async function list(req: Request, res: Response) {
  const organizations = await listOrganizations(req.user!.id);
  res.json({ organizations });
}

export async function create(req: Request, res: Response) {
  const organization = await createOrganization(req.user!.id, req.body as CreateOrganizationInputSchema);
  res.status(201).json(organization);
}

export async function get(req: Request, res: Response) {
  const organization = await getOrganization(req.user!.id, routeParam(req, "organizationId"));
  res.json(organization);
}

export async function members(req: Request, res: Response) {
  const result = await listMembers(req.user!.id, routeParam(req, "organizationId"));
  res.json(result);
}

export async function invite(req: Request, res: Response) {
  const result = await inviteMember(req.user!.id, req.body as InviteMemberInputSchema);
  res.status(201).json(result);
}

export async function accept(req: Request, res: Response) {
  const organization = await acceptInvite(req.user!.id, req.body as AcceptInviteInputSchema);
  res.json(organization);
}

export async function revoke(req: Request, res: Response) {
  const result = await revokeInvite(req.user!.id, req.body as RevokeInviteInputSchema);
  res.json(result);
}

export async function updateRole(req: Request, res: Response) {
  const result = await updateMemberRole(req.user!.id, req.body as UpdateMemberRoleInputSchema);
  res.json(result);
}

export async function remove(req: Request, res: Response) {
  const result = await removeMember(req.user!.id, req.body as RemoveMemberInputSchema);
  res.json(result);
}
