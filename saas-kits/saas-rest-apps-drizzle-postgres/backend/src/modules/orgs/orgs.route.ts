import { Router } from "express";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validate, validateAll } from "../../shared/middleware/validate";
import * as orgsController from "./orgs.controller";
import {
  acceptInviteInputSchema,
  createOrganizationInputSchema,
  inviteMemberInputSchema,
  organizationIdInputSchema,
  removeMemberInputSchema,
  revokeInviteInputSchema,
  updateMemberRoleInputSchema,
} from "./model";

export const orgsRouter = Router();

orgsRouter.post("/invites/accept", requireAuth, validate(acceptInviteInputSchema), orgsController.accept);
orgsRouter.get("/", requireAuth, orgsController.list);
orgsRouter.post("/", requireAuth, validate(createOrganizationInputSchema), orgsController.create);
orgsRouter.get("/:organizationId", requireAuth, validateAll(organizationIdInputSchema), orgsController.get);
orgsRouter.get("/:organizationId/members", requireAuth, validateAll(organizationIdInputSchema), orgsController.members);
orgsRouter.post("/:organizationId/invites", requireAuth, validateAll(inviteMemberInputSchema), orgsController.invite);
orgsRouter.delete(
  "/:organizationId/invites/:inviteId",
  requireAuth,
  validateAll(revokeInviteInputSchema),
  orgsController.revoke,
);
orgsRouter.patch(
  "/:organizationId/members/:userId",
  requireAuth,
  validateAll(updateMemberRoleInputSchema),
  orgsController.updateRole,
);
orgsRouter.delete(
  "/:organizationId/members/:userId",
  requireAuth,
  validateAll(removeMemberInputSchema),
  orgsController.remove,
);
