import { Router } from "express";
import {
  adminGrantAccessInputSchema,
  adminRevokeAccessInputSchema,
  adminSearchUsersInputSchema,
  adminUserIdInputSchema,
} from "@repo/services";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validate, validateMerged } from "../../shared/middleware/validate";
import * as adminController from "./admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.get("/users", validate(adminSearchUsersInputSchema, "query"), adminController.search);
adminRouter.get("/users/:userId", validate(adminUserIdInputSchema, "params"), adminController.getUser);
adminRouter.post(
  "/organizations/:organizationId/access",
  validateMerged(adminGrantAccessInputSchema),
  adminController.grant,
);
adminRouter.delete(
  "/organizations/:organizationId/access",
  validateMerged(adminRevokeAccessInputSchema),
  adminController.revoke,
);
