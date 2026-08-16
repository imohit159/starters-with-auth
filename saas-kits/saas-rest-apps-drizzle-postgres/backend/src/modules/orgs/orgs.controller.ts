import type { Request, Response } from "express";
import * as orgsService from "./orgs.service";
import type {
  AcceptInviteInputSchema,
  CreateOrganizationInputSchema,
  InviteMemberInputSchema,
  OrganizationIdInputSchema,
  RemoveMemberInputSchema,
  RevokeInviteInputSchema,
  UpdateMemberRoleInputSchema,
} from "./model";

export async function list(req: Request, res: Response) {
  const organizations = await orgsService.listOrganizations(req.user!.id);
  res.json({ organizations });
}

export async function create(req: Request, res: Response) {
  const organization = await orgsService.createOrganization(
    req.user!.id,
    req.body as CreateOrganizationInputSchema,
  );
  res.status(201).json({ organization });
}

export async function get(req: Request, res: Response) {
  const input = req.body as OrganizationIdInputSchema;
  const organization = await orgsService.getOrganization(req.user!.id, input.organizationId);
  res.json({ organization });
}

export async function members(req: Request, res: Response) {
  const input = req.body as OrganizationIdInputSchema;
  const result = await orgsService.listMembers(req.user!.id, input.organizationId);
  res.json(result);
}

export async function invite(req: Request, res: Response) {
  const result = await orgsService.inviteMember(req.user!.id, req.body as InviteMemberInputSchema);
  res.status(201).json(result);
}

export async function accept(req: Request, res: Response) {
  const organization = await orgsService.acceptInvite(req.user!.id, req.body as AcceptInviteInputSchema);
  res.json({ organization });
}

export async function revoke(req: Request, res: Response) {
  const result = await orgsService.revokeInvite(req.user!.id, req.body as RevokeInviteInputSchema);
  res.json(result);
}

export async function updateRole(req: Request, res: Response) {
  const result = await orgsService.updateMemberRole(req.user!.id, req.body as UpdateMemberRoleInputSchema);
  res.json(result);
}

export async function remove(req: Request, res: Response) {
  const result = await orgsService.removeMember(req.user!.id, req.body as RemoveMemberInputSchema);
  res.json(result);
}
