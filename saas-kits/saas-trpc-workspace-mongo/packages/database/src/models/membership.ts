import mongoose, { Schema } from "mongoose";
import { ORG_ROLE } from "../constants";

const membershipSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: Object.values(ORG_ROLE),
      default: ORG_ROLE.member,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1 });
membershipSchema.index({ organizationId: 1 });

export type MembershipDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof membershipSchema> & { createdAt: Date; updatedAt: Date }
>;

export const Membership = mongoose.model("Membership", membershipSchema);
