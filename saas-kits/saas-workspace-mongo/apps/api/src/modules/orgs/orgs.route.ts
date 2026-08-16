import { Router } from "express";
import {
  acceptInviteInputSchema,
  createOrganizationInputSchema,
  inviteMemberInputSchema,
  organizationIdInputSchema,
  removeMemberInputSchema,
  revokeInviteInputSchema,
  updateMemberRoleInputSchema,
} from "@repo/services";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validate, validateMerged } from "../../shared/middleware/validate";
import * as orgsController from "./orgs.controller";

export const orgsRouter = Router();

orgsRouter.use(requireAuth);
orgsRouter.get("/", orgsController.list);
orgsRouter.post("/", validate(createOrganizationInputSchema), orgsController.create);
orgsRouter.post("/invites/accept", validate(acceptInviteInputSchema), orgsController.accept);
orgsRouter.get("/:organizationId", validate(organizationIdInputSchema, "params"), orgsController.get);
orgsRouter.get(
  "/:organizationId/members",
  validate(organizationIdInputSchema, "params"),
  orgsController.members,
);
orgsRouter.post("/:organizationId/invites", validateMerged(inviteMemberInputSchema), orgsController.invite);
orgsRouter.delete(
  "/:organizationId/invites/:inviteId",
  validateMerged(revokeInviteInputSchema),
  orgsController.revoke,
);
orgsRouter.patch(
  "/:organizationId/members/:userId",
  validateMerged(updateMemberRoleInputSchema),
  orgsController.updateRole,
);
orgsRouter.delete(
  "/:organizationId/members/:userId",
  validateMerged(removeMemberInputSchema),
  orgsController.remove,
);
