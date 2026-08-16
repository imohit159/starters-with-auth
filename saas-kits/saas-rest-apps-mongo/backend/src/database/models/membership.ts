import mongoose, { Schema } from "mongoose";
import { ORG_ROLE } from "../constants";

const membershipSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: Object.values(ORG_ROLE),
      default: ORG_ROLE.member,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export type MembershipDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof membershipSchema>
>;

export const Membership = mongoose.model("Membership", membershipSchema);
