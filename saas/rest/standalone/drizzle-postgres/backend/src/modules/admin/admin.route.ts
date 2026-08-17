import { Router } from "express";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validateAll } from "../../shared/middleware/validate";
import * as adminController from "./admin.controller";
import {
  adminGrantAccessInputSchema,
  adminRevokeAccessInputSchema,
  adminSearchUsersInputSchema,
  adminUserIdInputSchema,
} from "./model";

export const adminRouter = Router();

adminRouter.get("/users", requireAuth, validateAll(adminSearchUsersInputSchema), adminController.search);
adminRouter.get("/users/:userId", requireAuth, validateAll(adminUserIdInputSchema), adminController.getUser);
adminRouter.post(
  "/orgs/:organizationId/grant",
  requireAuth,
  validateAll(adminGrantAccessInputSchema),
  adminController.grant,
);
adminRouter.post(
  "/orgs/:organizationId/revoke",
  requireAuth,
  validateAll(adminRevokeAccessInputSchema),
  adminController.revoke,
);
