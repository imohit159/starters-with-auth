import mongoose, { Schema } from "mongoose";
import { INVITE_STATUS, ORG_ROLE } from "../constants";

const organizationInviteSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: [ORG_ROLE.admin, ORG_ROLE.member],
      default: ORG_ROLE.member,
    },
    status: {
      type: String,
      enum: Object.values(INVITE_STATUS),
      default: INVITE_STATUS.pending,
    },
    tokenHash: { type: String, required: true, unique: true },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

organizationInviteSchema.index({ organizationId: 1, email: 1, status: 1 });
organizationInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OrganizationInviteDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof organizationInviteSchema>
>;

export const OrganizationInvite = mongoose.model("OrganizationInvite", organizationInviteSchema);
