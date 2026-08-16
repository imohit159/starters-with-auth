import mongoose, { Schema } from "mongoose";
import { SUBSCRIPTION_STATUS } from "../constants";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.none,
    },
    subscriptionEndsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

organizationSchema.index(
  { stripeCustomerId: 1 },
  { unique: true, partialFilterExpression: { stripeCustomerId: { $type: "string" } } },
);
organizationSchema.index(
  { stripeSubscriptionId: 1 },
  { unique: true, partialFilterExpression: { stripeSubscriptionId: { $type: "string" } } },
);
organizationSchema.index({ subscriptionStatus: 1 });

export type OrganizationDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof organizationSchema>
>;

export const Organization = mongoose.model("Organization", organizationSchema);
